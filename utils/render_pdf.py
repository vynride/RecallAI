import pdfkit
import io

def html_to_pdf(html_content: str):

    pdf_buffer = io.BytesIO()

    options = {
        "enable-local-file-access": "",
    }

    pdf_data = pdfkit.from_string(html_content, False, options=options)

    pdf_buffer.write(pdf_data)
    pdf_buffer.seek(0)

    return pdf_buffer