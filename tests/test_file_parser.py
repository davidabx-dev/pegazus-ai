import pytest
from pegazus_ai.services.file_parser import file_parser_service

def test_parse_text_file():
    content = "Este é um conteúdo de teste em texto simples.".encode("utf-8")
    parsed = file_parser_service.parse_file("documento.txt", content)
    assert "conteúdo de teste" in parsed

def test_parse_unsupported_file_extension():
    content = b"fake binary data"
    with pytest.raises(ValueError, match="Formato de arquivo não suportado"):
        file_parser_service.parse_file("planilha.xlsx", content)

def test_parse_empty_text_file_raises_error():
    content = b""
    with pytest.raises(ValueError, match="vazio"):
        file_parser_service.parse_file("vazio.txt", content)

def test_parse_scanned_pdf_with_ocr():
    import fitz
    # Criar um PDF que contém apenas uma imagem (sem camada de texto selecionável)
    doc = fitz.open()
    page = doc.new_page(width=400, height=200)
    
    # Renderizar um texto desenhado como forma/imagem (pixmap) na página
    pix = fitz.Pixmap(fitz.csRGB, fitz.Rect(0, 0, 400, 200), False)
    pix.clear_with(255) # background branco
    
    # Criar imagem com texto usando Pillow
    from PIL import Image, ImageDraw
    img = Image.new('RGB', (400, 200), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((20, 80), "EXAME LAUDO MEDICO BETA HCG", fill=(0, 0, 0))
    
    import io
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    
    # Inserir imagem no PDF
    page.insert_image(page.rect, stream=img_bytes.getvalue())
    pdf_bytes = doc.tobytes()
    doc.close()
    
    parsed_text = file_parser_service.parse_file("laudo_escaneado.pdf", pdf_bytes)
    assert len(parsed_text) > 0
    assert "HCG" in parsed_text or "BETA" in parsed_text or "EXAME" in parsed_text or "LAUDO" in parsed_text

