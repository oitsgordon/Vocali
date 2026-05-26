const recordingsDatabaseName = "vocali-recordings";
const recordingsStoreName = "recordings";
const recordingsDatabaseVersion = 1;

type StoredRecording = {
  attemptId: string;
  audioBlob: Blob;
  savedAt: string;
};

function canUseIndexedDb() {
  try {
    return typeof window !== "undefined" && "indexedDB" in window;
  } catch {
    return false;
  }
}

function openRecordingsDatabase(): Promise<IDBDatabase | null> {
  if (!canUseIndexedDb()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;

    try {
      request = window.indexedDB.open(
        recordingsDatabaseName,
        recordingsDatabaseVersion,
      );
    } catch {
      resolve(null);
      return;
    }

    request.onupgradeneeded = () => {
      try {
        const database = request.result;

        if (!database.objectStoreNames.contains(recordingsStoreName)) {
          database.createObjectStore(recordingsStoreName, {
            keyPath: "attemptId",
          });
        }
      } catch {
        resolve(null);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

export async function saveRecording(attemptId: string, audioBlob: Blob) {
  const database = await openRecordingsDatabase();

  if (!database) {
    return false;
  }

  return new Promise<boolean>((resolve) => {
    const transaction = database.transaction(recordingsStoreName, "readwrite");
    const store = transaction.objectStore(recordingsStoreName);

    store.put({
      attemptId,
      audioBlob,
      savedAt: new Date().toISOString(),
    } satisfies StoredRecording);

    transaction.oncomplete = () => {
      database.close();
      resolve(true);
    };

    transaction.onerror = () => {
      database.close();
      resolve(false);
    };

    transaction.onabort = () => {
      database.close();
      resolve(false);
    };
  });
}

export async function getRecording(attemptId: string) {
  const database = await openRecordingsDatabase();

  if (!database) {
    return null;
  }

  return new Promise<Blob | null>((resolve) => {
    const transaction = database.transaction(recordingsStoreName, "readonly");
    const store = transaction.objectStore(recordingsStoreName);
    const request = store.get(attemptId);

    request.onsuccess = () => {
      const result = request.result as StoredRecording | undefined;
      resolve(result?.audioBlob ?? null);
    };

    request.onerror = () => resolve(null);

    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
    transaction.onabort = () => database.close();
  });
}

export async function deleteRecording(attemptId: string) {
  const database = await openRecordingsDatabase();

  if (!database) {
    return false;
  }

  return new Promise<boolean>((resolve) => {
    const transaction = database.transaction(recordingsStoreName, "readwrite");
    const store = transaction.objectStore(recordingsStoreName);

    store.delete(attemptId);

    transaction.oncomplete = () => {
      database.close();
      resolve(true);
    };

    transaction.onerror = () => {
      database.close();
      resolve(false);
    };

    transaction.onabort = () => {
      database.close();
      resolve(false);
    };
  });
}

export async function clearRecordings() {
  const database = await openRecordingsDatabase();

  if (!database) {
    return false;
  }

  return new Promise<boolean>((resolve) => {
    const transaction = database.transaction(recordingsStoreName, "readwrite");
    const store = transaction.objectStore(recordingsStoreName);

    store.clear();

    transaction.oncomplete = () => {
      database.close();
      resolve(true);
    };

    transaction.onerror = () => {
      database.close();
      resolve(false);
    };

    transaction.onabort = () => {
      database.close();
      resolve(false);
    };
  });
}
