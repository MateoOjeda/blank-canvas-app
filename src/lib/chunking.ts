import { Firestore, WriteBatch, writeBatch, DocumentReference, UpdateData, WithFieldValue, SetOptions } from "firebase/firestore";

/**
 * Divide un array en pequeños chunks (arrays más pequeños).
 * Útil para queries 'in' o 'array-contains-any' de Firestore que tienen un límite de 30 elementos.
 * @param array El array original a dividir.
 * @param size El tamaño máximo de cada chunk (default: 30 para Firestore 'in').
 * @returns Array de arrays (chunks).
 */
export function chunkArray<T>(array: T[], size: number = 30): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Ejecuta múltiples WriteBatches cuando las operaciones superan el límite de 500 de Firestore.
 * Funciona como un reemplazo directo de writeBatch(db).
 */
export class ChunkedBatch {
  private db: Firestore;
  private batches: WriteBatch[] = [];
  private currentBatch: WriteBatch;
  private operationCount = 0;
  private readonly MAX_OPS = 500;

  constructor(db: Firestore) {
    this.db = db;
    this.currentBatch = writeBatch(db);
    this.batches.push(this.currentBatch);
  }

  private checkLimit() {
    if (this.operationCount >= this.MAX_OPS) {
      this.currentBatch = writeBatch(this.db);
      this.batches.push(this.currentBatch);
      this.operationCount = 0;
    }
  }

  set<T>(docRef: DocumentReference<T>, data: WithFieldValue<T>, options?: SetOptions) {
    this.checkLimit();
    if (options) {
      this.currentBatch.set(docRef, data, options);
    } else {
      this.currentBatch.set(docRef, data);
    }
    this.operationCount++;
    return this;
  }

  update<T>(docRef: DocumentReference<T>, data: UpdateData<T>) {
    this.checkLimit();
    this.currentBatch.update(docRef, data);
    this.operationCount++;
    return this;
  }

  delete(docRef: DocumentReference<any>) {
    this.checkLimit();
    this.currentBatch.delete(docRef);
    this.operationCount++;
    return this;
  }

  async commit() {
    const promises = this.batches.map(batch => batch.commit());
    await Promise.all(promises);
  }
}
