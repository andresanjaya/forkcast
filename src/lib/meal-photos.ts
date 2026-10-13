const DATABASE = "forkcast-meal-photos";
const STORE = "photos";
export const MEAL_PHOTO_BUCKET = "meal-photos";

function openPhotoDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Penyimpanan foto tidak tersedia."));
  });
}

async function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason: unknown) => void) => void): Promise<T> {
  const database = await openPhotoDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE, mode);
    let settled = false;
    let result: T | undefined;
    const succeed = (value: T) => { result = value; };
    const fail = (reason: unknown) => { if (!settled) { settled = true; reject(reason); } };
    transaction.oncomplete = () => { database.close(); if (!settled) { settled = true; resolve(result as T); } };
    transaction.onerror = () => { database.close(); fail(transaction.error); };
    transaction.onabort = () => { database.close(); fail(transaction.error); };
    action(transaction.objectStore(STORE), succeed, fail);
  });
}

export function saveLocalMealPhoto(mealId: string, blob: Blob): Promise<void> {
  return transact<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(blob, mealId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function getLocalMealPhoto(mealId: string): Promise<Blob | null> {
  return transact<Blob | null>("readonly", (store, resolve, reject) => {
    const request = store.get(mealId);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
    request.onerror = () => reject(request.error);
  });
}

export function deleteLocalMealPhoto(mealId: string): Promise<void> {
  return transact<void>("readwrite", (store, resolve, reject) => {
    const request = store.delete(mealId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function clearLocalMealPhotos(): Promise<void> {
  return transact<void>("readwrite", (store, resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function compressMealPhoto(file: Blob): Promise<Blob> {
  if (file.size > 8 * 1024 * 1024) throw new Error("Foto harus berukuran di bawah 8 MB.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const canvas = document.createElement("canvas");
    let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    for (const quality of [0.82, 0.72, 0.62, 0.52]) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Foto tidak dapat diproses.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const result = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Foto tidak dapat dikompresi.")), "image/jpeg", quality));
      if (result.size <= 3 * 1024 * 1024 && result.size < file.size) return result;
      scale *= 0.8;
    }
    throw new Error("Foto tidak dapat dikompresi lebih kecil. Pilih foto lain.");
  } finally {
    bitmap.close();
  }
}
