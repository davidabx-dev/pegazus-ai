import io

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limite de upload por arquivo
MAX_PDF_PAGES = 50                       # Proteção contra PDF Decompression Bomb (exaustão de memória)
MAX_EXTRACTED_TEXT_LENGTH = 1_000_000   # 1 milhão de caracteres (~200 mil palavras)

class FileParserService:
    """Serviço de parsing para extração de texto a partir de arquivos (.pdf, .docx, .txt, .md, .png, .jpg, .jpeg, .webp)
    com OCR para PDFs escaneados/imagens e proteção contra Decompression Bombs e estouro de memória."""

    def __init__(self):
        self._ocr_engine = None

    def _get_ocr_engine(self):
        if self._ocr_engine is None:
            try:
                from rapidocr_onnxruntime import RapidOCR
                self._ocr_engine = RapidOCR()
            except Exception as e:
                raise ValueError(f"Não foi possível inicializar o motor de OCR: {str(e)}")
        return self._ocr_engine

    def _ocr_image_bytes(self, image_bytes: bytes) -> str:
        engine = self._get_ocr_engine()
        result, _ = engine(image_bytes)
        if not result:
            return ""
        extracted_lines = []
        for line in result:
            if len(line) >= 2 and line[1]:
                txt = str(line[1]).strip()
                if txt:
                    extracted_lines.append(txt)
        return "\n".join(extracted_lines)

    def parse_file(self, filename: str, content_bytes: bytes) -> str:
        if not content_bytes:
            raise ValueError("O arquivo enviado está vazio.")

        # 🚩 PROTEÇÃO CONTRA DECOMPRESSION BOMB / MEMORY EXHAUSTION
        if len(content_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError(
                f"O tamanho do arquivo excede o limite máximo permitido de {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB."
            )

        lower_name = filename.lower()

        if lower_name.endswith(".pdf"):
            return self._parse_pdf(content_bytes)
        elif lower_name.endswith(".docx"):
            return self._parse_docx(content_bytes)
        elif lower_name.endswith(".txt") or lower_name.endswith(".md"):
            return self._parse_text(content_bytes)
        elif lower_name.endswith((".png", ".jpg", ".jpeg", ".webp")):
            return self._parse_image(content_bytes)
        else:
            raise ValueError(f"Formato de arquivo não suportado: {filename}. Utilize .pdf, .docx, .txt, .md, .png, .jpg ou .jpeg")

    def _parse_pdf(self, content_bytes: bytes) -> str:
        try:
            extracted_pages = []
            total_chars = 0

            # 1. Tenta extração via PyMuPDF (fitz) - texto selecionável
            try:
                import fitz
                doc = fitz.open(stream=content_bytes, filetype="pdf")
                
                if len(doc) > MAX_PDF_PAGES:
                    raise ValueError(
                        f"O arquivo PDF excede o limite máximo de {MAX_PDF_PAGES} páginas."
                    )

                for page in doc:
                    text = page.get_text("text").strip()
                    if text:
                        total_chars += len(text)
                        if total_chars > MAX_EXTRACTED_TEXT_LENGTH:
                            raise ValueError(
                                f"O texto extraído do PDF excede o limite máximo de {MAX_EXTRACTED_TEXT_LENGTH} caracteres."
                            )
                        extracted_pages.append(text)
                doc.close()
            except ValueError:
                raise
            except Exception:
                extracted_pages = []
                total_chars = 0

            # 2. Fallback via pypdf caso PyMuPDF não retorne texto selecionável
            if not extracted_pages:
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(content_bytes))
                
                if len(reader.pages) > MAX_PDF_PAGES:
                    raise ValueError(
                        f"O arquivo PDF excede o limite máximo de {MAX_PDF_PAGES} páginas."
                    )

                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        total_chars += len(text)
                        if total_chars > MAX_EXTRACTED_TEXT_LENGTH:
                            raise ValueError(
                                f"O texto extraído do PDF excede o limite máximo de {MAX_EXTRACTED_TEXT_LENGTH} caracteres."
                            )
                        extracted_pages.append(text)

            full_text = "\n\n".join(extracted_pages).strip()

            # 3. Fallback via OCR (RapidOCR) caso o PDF não possua camada de texto selecionável (PDF escaneado/imagem)
            if not full_text:
                try:
                    import fitz
                    doc = fitz.open(stream=content_bytes, filetype="pdf")
                    if len(doc) > MAX_PDF_PAGES:
                        raise ValueError(
                            f"O arquivo PDF excede o limite máximo de {MAX_PDF_PAGES} páginas."
                        )

                    ocr_pages = []
                    for page in doc:
                        pix = page.get_pixmap(dpi=150)
                        img_bytes = pix.tobytes("png")
                        ocr_text = self._ocr_image_bytes(img_bytes)
                        if ocr_text:
                            ocr_pages.append(ocr_text)
                    doc.close()
                    full_text = "\n\n".join(ocr_pages).strip()
                except ValueError:
                    raise
                except Exception as e:
                    pass

            if not full_text:
                raise ValueError("Não foi possível extrair texto do PDF (camada de texto ou OCR). Verifique se o documento está legível.")
            return full_text
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Erro ao extrair conteúdo do PDF: {str(e)}")

    def _parse_image(self, content_bytes: bytes) -> str:
        try:
            text = self._ocr_image_bytes(content_bytes).strip()
            if not text:
                raise ValueError("Nenhum texto legível foi encontrado na imagem enviada.")
            if len(text) > MAX_EXTRACTED_TEXT_LENGTH:
                raise ValueError(
                    f"O texto extraído da imagem excede o limite máximo de {MAX_EXTRACTED_TEXT_LENGTH} caracteres."
                )
            return text
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Erro ao extrair texto da imagem via OCR: {str(e)}")

    def _parse_docx(self, content_bytes: bytes) -> str:
        try:
            import zipfile
            import docx

            # 🚩 PRÉ-CHECAGEM EXPLÍCITA (Zip Bomb Pre-check em 0.14ms via ZipFile.infolist):
            # Calcula o tamanho descomprimido bruto antes de acionar o parser do python-docx / lxml
            with zipfile.ZipFile(io.BytesIO(content_bytes)) as zip_file:
                uncompressed_size = sum(z.file_size for z in zip_file.infolist())
                if uncompressed_size > 20 * 1024 * 1024:  # 20 MB max uncompressed
                    raise ValueError("O conteúdo descompactado do arquivo DOCX excede o limite máximo permitido de 20MB.")

            doc = docx.Document(io.BytesIO(content_bytes))
            paragraphs = []
            total_chars = 0

            for p in doc.paragraphs:
                txt = p.text.strip()
                if txt:
                    total_chars += len(txt)
                    if total_chars > MAX_EXTRACTED_TEXT_LENGTH:
                        raise ValueError(
                            f"O texto extraído do DOCX excede o limite máximo de {MAX_EXTRACTED_TEXT_LENGTH} caracteres."
                        )
                    paragraphs.append(txt)

            full_text = "\n\n".join(paragraphs).strip()
            if not full_text:
                raise ValueError("O arquivo DOCX está vazio.")
            return full_text
        except ValueError:
            raise
        except Exception:
            # 🔒 Erro genérico sanitizado pro cliente sem vazar stack trace do lxml/python-docx
            raise ValueError("Falha no processamento da estrutura do arquivo DOCX. Verifique se o arquivo não está corrompido.")

    def _parse_text(self, content_bytes: bytes) -> str:
        try:
            text = content_bytes.decode("utf-8", errors="replace").strip()
            if not text:
                raise ValueError("O arquivo de texto está vazio.")
            if len(text) > MAX_EXTRACTED_TEXT_LENGTH:
                raise ValueError(
                    f"O texto do arquivo excede o limite máximo de {MAX_EXTRACTED_TEXT_LENGTH} caracteres."
                )
            return text
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Erro ao ler arquivo de texto: {str(e)}")

file_parser_service = FileParserService()
