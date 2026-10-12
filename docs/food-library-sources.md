# Katalog awal makanan Indonesia (MVP 6)

Katalog ini berisi sembilan entri yang ditinjau manual. Nilai energi (kkal), protein, karbohidrat, dan lemak (g) disimpan per 100 g bagian yang dimakan. Rujukannya adalah **USDA National Nutrient Database for Standard Reference, Release 28 (2015)**, melalui laporan resmi di bawah. [USDA FoodData Central](https://fdc.nal.usda.gov/) menyatakan data pangannya berada dalam domain publik (CC0); tautan dan identitas NDB tetap dicantumkan untuk memudahkan pemeriksaan. Ini bukan salinan massal database.

| Entri Forkcast | NDB dan bahan rujukan | kkal | P | K | L | Keterangan |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Nasi putih matang | [20345, rice white long-grain cooked](https://www.ars.usda.gov/ARSUserFiles/80400535/Data/SR/SR28/reports/sr28fg20.pdf) | 130 | 2,69 | 28,17 | 0,28 | Padanan nasi putih matang; cangkir 158 g adalah ukuran perkiraan. |
| Telur rebus | [01129, egg whole cooked hard-boiled](https://www.ars.usda.gov/ARSUserFiles/80400535/Data/SR/SR28/reports/sr28fg01.pdf) | 155 | 12,58 | 1,12 | 10,61 | Butir besar 50 g bagian yang dimakan. |
| Tempe matang tanpa minyak | [16174, tempeh cooked](https://www.ars.usda.gov/ARSUserFiles/80400535/Data/SR/SR28/reports/sr28fg16.pdf) | 195 | 19,91 | 7,62 | 11,38 | Bukan tempe goreng. |
| Tahu putih padat | [16426, tofu raw firm prepared with calcium sulfate](https://www.ars.usda.gov/ARSUserFiles/80400535/Data/SR/SR28/reports/sr28fg16.pdf) | 76 | 8,08 | 1,87 | 4,78 | Padanan tahu padat mentah; seperempat blok 81 g bersifat perkiraan. |
| Bayam rebus tanpa garam | [11458, spinach cooked boiled drained](https://www.ars.usda.gov/ARSUserFiles/80400535/Data/SR/SR28/reports/sr28fg11.pdf) | 34 | 4,01 | 4,80 | 0,87 | Padanan spinach tanpa kuah atau bumbu. |
| Pisang segar | [09040, banana raw](https://www.ars.usda.gov/ARSUserFiles/80400535/Data/SR/SR28/reports/sr28fg09.pdf) | 89 | 1,09 | 22,84 | 0,33 | Jenis pisang lokal bisa berbeda; buah kecil 81 g perkiraan. |
| Pepaya segar | [09226, papaya raw](https://www.ars.usda.gov/ARSUserFiles/80400535/Data/SR/SR28/reports/sr28fg09.pdf) | 43 | 0,47 | 10,82 | 0,26 | Daging buah tanpa kulit dan biji. |
| Air kelapa kemasan tanpa gula | [14090, coconut water ready-to-drink unsweetened](https://www.ars.usda.gov/ARSUserFiles/80400535/Data/SR/SR28/reports/sr28fg14.pdf) | 18 | 0,22 | 4,24 | 0 | Padanan produk siap minum, bukan klaim untuk semua air kelapa segar. |
| Nasi dengan telur rebus | [20345 nasi](https://www.ars.usda.gov/ARSUserFiles/80400535/Data/SR/SR28/reports/sr28fg20.pdf) + [01129 telur](https://www.ars.usda.gov/ARSUserFiles/80400535/Data/SR/SR28/reports/sr28fg01.pdf) | 138,33 | 5,99 | 19,15 | 3,72 | Resep contoh 100 g nasi + 50 g telur, tanpa saus/minyak. Nilai per 100 g = (nilai nasi + 0,5 × nilai telur) / 1,5, dibulatkan dua desimal. Porsi 150 g adalah perkiraan. |

Nama lokal yang tidak identik dengan nama bahan USDA ditandai **padanan** di aplikasi. Entri contoh lama (misalnya soto dan rendang) tetap berada dalam pencatatan manual dengan label “Data contoh untuk demo”; keduanya tidak masuk katalog bersumber ini. Tidak ada angka yang diisi dari AI. Jika suatu nilai gizi tidak didukung oleh rujukan, makanan tersebut tidak masuk katalog awal.

Katalog ini berupa data statis aplikasi agar pencarian kecil ini cepat dan tersedia saat offline. Tidak ada tabel katalog Supabase, migrasi, atau hak tulis katalog dari klien. Catatan baru tetap menyimpan snapshot nilai per 100 g dan sumber dalam `meal_items`. Daftar terbaru/sering dicatat dihitung dari `meals` akun yang dimuat aplikasi; RLS tabel `meals` dan `meal_items` menggunakan `auth.uid()` sesuai migrasi yang sudah ada. Pengujian RLS terhadap database produksi masih memerlukan akses Supabase langsung.
