export interface Result<T> {
  data: T;
}

export interface BookInfo {
  bookId: number;
  title: string;
  author: string;
  href: string;
}

export interface BookKeys {
  clientKey: string;
  signature: string;
  source: string;
}

export interface EpubManifest {
  text: string[];
  images: string[];
  css: string[];
  ncx: string[];
  opf?: string
}

export interface BookType {
  bookId: number,
  fileIdentifier: string,
  title: string,
  type: string
}

export interface EupbContent {
  txt: string,
  epub: string
}

export interface AxiosParams {
  book_id: number,
  file_identifier: string,
  section_source: string,
  access_token: string
}