/**
 * FirestoreDataHandler: Chainable utility for Firestore data transformation.
 * Usage:
 *   new FirestoreDataHandler(data)
 *     .serializeTimestamps()
 *     .serializeLocationObject()
 *     .value;
 */
class FirestoreDataHandler {
  data: any;

  constructor(data: any) {
    this.data = data;
  }

  /**
   * Recursively converts all Firestore Timestamp or Date properties in an object to ISO strings.
   * Supports nested objects and arrays.
   */
  serializeTimestamps(): this {
    const convert = (value: any): any => {
      if (value == null) return value;
      if (typeof value?.toDate === 'function') {
        return value.toDate().toISOString();
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (Array.isArray(value)) {
        return value.map(convert);
      }
      if (typeof value === 'object') {
        const result: any = {};
        for (const key in value) {
          result[key] = convert(value[key]);
        }
        return result;
      }
      return value;
    };
    this.data = convert(this.data);
    return this;
  }

  get value() {
    return this.data;
  }
}

export { FirestoreDataHandler };
