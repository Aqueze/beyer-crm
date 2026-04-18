declare module "vcard" {
  export class VCard {
    constructor();
    set(key: string, value: string): void;
    toString(): string;
  }
}