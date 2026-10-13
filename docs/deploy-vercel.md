# Deploy forkcast ke Vercel

Panduan ini memakai repositori `andresanjaya/forkcast`. Aplikasi Next.js dan endpoint `POST /api/meal/analyze` akan terdeploy bersama; tidak perlu membuat proyek API terpisah.

## 1. Siapkan database Supabase

1. Buka [SQL Editor proyek Supabase](https://supabase.com/dashboard/project/dkkwfkerzljyjspwbwdd/sql/new).
2. Jika tabel aplikasi belum ada, jalankan seluruh isi [`supabase/migrations/20261011000100_food_tracker.sql`](../supabase/migrations/20261011000100_food_tracker.sql) **sekali**. Jangan jalankan ulang migration `create table` pada database yang sudah berisi tabel tersebut. Migration ini mengaktifkan RLS dan kebijakan akses per pengguna.
3. Jalankan seluruh isi [`supabase/migrations/20261011000200_accounts_targets.sql`](../supabase/migrations/20261011000200_accounts_targets.sql) **sekali** setelah migration pertama. Ini menambah riwayat target, parameter "tidak ingin menyebutkan", dan fungsi simpan profil/berat/target. Target yang sudah ada dipertahankan sebagai entri riwayat pertama.
4. Jalankan seluruh isi [`supabase/migrations/20261012000100_personal_meal_memory.sql`](../supabase/migrations/20261012000100_personal_meal_memory.sql) **sekali** setelah migration kedua. Ini menambah detail kombinasi tersimpan dan tabel koreksi makanan dengan RLS per pengguna.
5. Jalankan [`supabase/migrations/20261012000200_packaged_food.sql`](../supabase/migrations/20261012000200_packaged_food.sql) jika belum diterapkan, lalu [`supabase/migrations/20261013000100_meal_photos.sql`](../supabase/migrations/20261013000100_meal_photos.sql). Migrasi foto menambah kolom opsional dan bucket privat `meal-photos`; catatan lama tetap ada. Jalankan sebelum mencoba menyimpan foto makanan ke akun.
6. Jalankan [`supabase/migrations/20261013000200_nutrition_targets.sql`](../supabase/migrations/20261013000200_nutrition_targets.sql) sebelum menyimpan target protein, karbohidrat, dan lemak dari akun. Migrasi ini menambah kolom opsional pada riwayat target lama dan fungsi penyimpanan target nutrisi.
6. Di **Authentication → Sign In / Providers → Email**, pastikan penyedia email aktif. Jangan nonaktifkan verifikasi email hanya untuk mempercepat pengujian.
7. Ambil **Project URL** dan **publishable key** dari **Project Settings → API Keys** atau menu **Connect**. Aplikasi tidak memerlukan password PostgreSQL, `DATABASE_URL`, atau service-role key.

## 2. Buat proyek Vercel

1. Buka [Vercel New Project](https://vercel.com/new), hubungkan GitHub jika diminta, lalu impor `andresanjaya/forkcast`.
2. Gunakan **Framework Preset: Next.js**, **Root Directory: `./`**, dan branch produksi **`main`**. Build command bawaan menjalankan `npm run build`.
3. Sebelum memilih **Deploy**, isi Environment Variables untuk **Production**:

   | Nama | Isi | Akses |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL dari Supabase | Publik, masuk ke bundle browser |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key dari Supabase | Publik, masuk ke bundle browser |
   | `GEMINI_API_KEY` | API key baru dari [Google AI Studio](https://aistudio.google.com/apikey) | Rahasia, hanya server |
   | `GEMINI_MODEL` | Opsional; kosongkan untuk `gemini-3.5-flash-lite` | Server |

   Proyek Supabase lama yang hanya punya anon key dapat memakai `NEXT_PUBLIC_SUPABASE_ANON_KEY` sebagai pengganti publishable key. Jangan masukkan secret/service-role key ke variabel `NEXT_PUBLIC_`. Jangan unggah `.env.local` ke GitHub atau Vercel sebagai berkas.

4. Pilih **Deploy** dan catat URL HTTPS produksi yang diberikan Vercel. Jika variabel diubah setelah deploy, lakukan **Redeploy** agar nilai `NEXT_PUBLIC_` terpasang di build baru.

## 3. Atur redirect Auth Supabase

Setelah URL produksi diketahui, buka [Authentication → URL Configuration](https://supabase.com/dashboard/project/dkkwfkerzljyjspwbwdd/auth/url-configuration):

- **Site URL**: `https://<domain-produksi-anda>` tanpa slash penutup, misalnya domain `*.vercel.app` yang Vercel berikan.
- **Redirect URLs**: tambahkan `https://<domain-produksi-anda>/**` dan tetap simpan `http://localhost:3000/**` untuk pengembangan lokal.
- Jika ingin menguji magic link pada Preview Deployment, tambahkan URL preview yang benar-benar digunakan ke daftar redirect. Hindari wildcard yang mengizinkan semua situs `vercel.app`.

Aplikasi mengirim URL asal halaman saat ini sebagai `emailRedirectTo`, sehingga alamat tersebut harus diizinkan di Supabase. Saat domain kustom dipasang, perbarui Site URL dan tambahkan redirect untuk domain kustom tersebut.

## 4. Lindungi dan uji API foto

- Di Vercel, buka **Project → Firewall → Configure → New Rule**. Buat aturan rate limit per IP untuk path `/api/meal/analyze` dan metode `POST`, lalu **Review Changes → Publish**. Misalnya mulai dari 5 request per 10 menit per IP dan sesuaikan berdasarkan pemakaian. Counter di dalam aplikasi hanya disimpan di memori satu Function, sehingga tidak menjamin kuota harian lintas instance.
- Batasi kuota atau anggaran Gemini di Google AI Studio. Kunci Gemini yang pernah dibagikan di chat sebaiknya diganti sebelum digunakan di produksi; simpan penggantinya hanya di Vercel Environment Variables dan `.env.local`.
- Buka situs produksi. Pastikan dashboard tampil, coba **Analisis foto** dengan foto makanan, koreksi kandidat dan porsi, lalu simpan. Untuk memeriksa Supabase, buka tab **Profil**, daftar dengan email dan kata sandi, konfirmasi email, lalu masuk. Simpan profil, target, berat, dan satu makanan dengan foto; muat ulang halaman, lalu buka detail dan kartu **Recently uploaded** untuk memastikan foto tetap tampil. Uji juga tautan pemulihan kata sandi.
- Jika foto gagal, periksa respons API dan **Vercel → Project → Logs**. `413` berarti foto terlalu besar; `503` dapat berarti API key, model, kuota, atau Gemini sedang tidak tersedia. Pencatatan manual tetap dapat digunakan.

Vercel membatasi body Function hingga 4,5 MB. Browser menerima berkas awal hingga 8 MB, lalu mengompresnya menjadi JPEG di bawah 4 MB sebelum upload. Endpoint berjalan pada Node.js dan diberi durasi maksimum 30 detik. Lihat [batas Vercel Functions](https://vercel.com/docs/functions/limitations), [Environment Variables](https://vercel.com/docs/environment-variables), [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), dan [Vercel WAF Rate Limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).
