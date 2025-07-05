# import datetime;
import fitz
import os
import re
import time
import streamlit as st
import streamlit_analytics2 as streamlit_analytics
from dotenv import load_dotenv
from io import BytesIO
from google import genai
from google.genai import types
from pathlib import Path
from utils.render_pdf import html_to_pdf

load_dotenv()

with streamlit_analytics.track(unsafe_password=(os.environ.get("STREAMLIT_ANALYTICS_PASS")), save_to_json="st_analytics.json", load_from_json="st_analytics.json"):
    st.set_page_config(
        page_title="Recall :: PYQ Analyzer",
        page_icon="📚",
        layout="wide",
    )


    st.title("📚 :green[Recall :: PYQ Analyzer]")
    st.markdown("Upload PDFs of Previous Year Question Papers (PYQs), and let AI do the Heavylifting for you!")


# do not track API key
key = st.text_input("Enter Google Gemini API key (get it [here](https://aistudio.google.com/apikey))", type="password")


with streamlit_analytics.track(unsafe_password=(os.environ.get("STREAMLIT_ANALYTICS_PASS")), save_to_json="st_analytics.json", load_from_json="st_analytics.json"):
    st.html("<!-- Comment to check for Page views --->")
    st.markdown(":gray[We don’t store your API keys. You are welcome to audit the [source code](https://github.com/vynride)]")

    selected_model = st.selectbox(
        "Choose a model: Models at the top take longer to process but produce more accurate and detailed results.",
        ("gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite-preview-06-17", "gemini-2.0-flash"),
    )

    st.text("")
    uploaded_files = st.file_uploader("📂 Upload one or more PDFs", type="pdf", accept_multiple_files=True)

    pyq_response_model_system_instructions = ""

    pyq_response_txt = Path(__file__).parent / "templates" / "pyq_model_system_instructions.txt"
    with open(pyq_response_txt, "r") as prompt_txt:
        pyq_response_model_system_instructions = prompt_txt.read()


    html_response_model_system_instructions = ""

    html_response_txt = Path(__file__).parent / "templates" / "html_response_model_system_instructions.txt"
    with open(html_response_txt, "r") as prompt_txt:
        html_response_model_system_instructions = prompt_txt.read()


    def pyq_response_model(extracted_text):
        client = genai.Client(
            api_key=key,
        )

        model = selected_model
        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=extracted_text),
                ],
            ),
        ]
        generate_content_config = types.GenerateContentConfig(
            response_mime_type="text/plain",
            system_instruction=[
                types.Part.from_text(text=pyq_response_model_system_instructions),
            ],
        )

        res = ""
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_content_config,
        ):
            if chunk.text:
                res += chunk.text

        return res


    def html_conversion_model(markdown_text):
        client = genai.Client(
            api_key=key,
        )

        model = selected_model
        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=markdown_text),
                ],
            ),
        ]
        generate_content_config = types.GenerateContentConfig(
            response_mime_type="text/plain",
            system_instruction=[
                types.Part.from_text(text=html_response_model_system_instructions),
            ],
        )

        res = ""
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_content_config,
        ):
            if chunk.text:
                res += chunk.text

        return res


    if uploaded_files and st.button("🔍 Analyze Question Papers"):

        if not key:
            st.error('Provide Gemini API Key', icon="🚨")

        all_docs = []

        try:
            for uploaded_file in uploaded_files:
                doc = fitz.open(stream=uploaded_file.read(), filetype="pdf")
                full_text = ""

            for page in doc:
                page_text = page.get_text().strip()
                full_text += f"\n\n---\n\n**Page {page.number + 1}**\n\n{page_text}"
                
            all_docs.append((uploaded_file.name, full_text))
        except:
            st.error('An Error occured while extracting text', icon="🚨")


        extracted_text = ""
        try:
            for filename, text in all_docs:
                extracted_text += f"\n\n# 📄 {filename}\n{text}"
        except:
            st.error('An Error occured while merging text', icon="🚨")
        

        with st.spinner("🧠 Recall is thinking — this may take up to 10 minutes. Please be patient"):
            
            st.success("✅ Extracted Questions from PDFs. Now calling Gemini for sorting")

            pyq_response = ""
            try:
                print(extracted_text)
                pyq_response = pyq_response_model(extracted_text)
                st.success("✅ Received Topic-wise sorted PYQs from Gemini. Now generating HTML")
            except Exception as e:
                print(e)
                st.error('An error occured when calling Gemini for PYQs', icon="🚨")

            html_conversion_response=""
            cleaned_html=""

            pdf_buffer = BytesIO(b"")

            try:
                html_conversion_response = html_conversion_model(pyq_response)

                # regex to remove ```html``` markdown style code fences
                cleaned_html = re.sub(r"```(?:html)?\n?|```", "", html_conversion_response).strip()

                st.success("✅ Generating Response PDF")

                pdf_buffer = html_to_pdf(cleaned_html)
                st.success("✅ All Set! You can now download the PDF below!")

            # this error needs to be more specific :: flash limit causes rate limit if too many files are uploaded
            except Exception as e:
                print(e)
                st.warning('An error occured when calling Gemini for HTML. Did you upload too many files? Retrying', icon="🚨")

                # retry incase of 503: model overloaded
                try:
                    time.sleep(60)
                    
                    html_conversion_response = html_conversion_model(pyq_response)

                    # regex to remove ```html``` markdown style code fences
                    cleaned_html = re.sub(r"```(?:html)?\n?|```", "", html_conversion_response).strip()

                    st.success("✅ Generating Response PDF")

                    pdf_buffer = html_to_pdf(cleaned_html)
                    st.success("✅ All Set! You can now download the PDF below!")

                except Exception as e:
                    print("Retry failed: " + e)
                    st.error('Retry failed :(', icon="🚨")


            # log html :: put inside try block if needed
            # with open("cleaned_html.html", 'w', encoding='utf-8') as html_file:
            #     html_file.write(cleaned_html)


        # timestamp for logs
        # ct = datetime.datetime.now()
        # ct_str = ct.strftime("%Y-%m-%d %H-%M-%S")

        # os.makedirs('logs', exist_ok=True)
        # with open(f"logs/{ct_str} - response.pdf", "wb") as pdf_file:
        #     pdf_file.write(pdf_buffer.getvalue())
        

        st.text("\n")

        if pdf_buffer:
            st.download_button(
                label="📥 Download PDF File",
                data=pdf_buffer,
                file_name="PYQs - Recall.pdf",
                mime="application/pdf"
            )

        st.text("\n")
        st.text("\n")
        st.markdown('<iframe src="https://ghbtns.com/github-btn.html?user=vynride&type=follow&count=false&size=large" frameborder="0" scrolling="0" width="170" height="30" title="GitHub"></iframe>', unsafe_allow_html=True)


        st.text("\n")
        st.markdown("""
            <style>
                .centered-text {text-align: center;}
            </style>
            
            <h2 class="centered-text">🧾 Preview <h2>
        """, unsafe_allow_html=True)

        if cleaned_html:
            st.markdown("📔 Topic-Wise PYQs")
            st.text("\n")
            st.html(cleaned_html)
