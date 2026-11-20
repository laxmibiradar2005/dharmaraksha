import os
import fitz  # PyMuPDF
import datetime

OUTPUT_PATH = r"c:\Users\arya\Desktop\darma rakshak ksit\DHARMARAKSHA_Tech_Stack_and_Architecture_Overview.pdf"

def generate_pdf():
    doc = fitz.open()
    
    html_content = """
    <html>
    <head>
    <style>
      body {
        font-family: "Helvetica", "Arial", sans-serif;
        font-size: 9.5px;
        line-height: 1.45;
        color: #1e293b;
      }
      
      .header-banner {
        background-color: #0f172a;
        color: #ffffff;
        padding: 16px 20px;
        border-radius: 6px;
        margin-bottom: 14px;
      }
      
      .title {
        font-size: 19px;
        font-weight: bold;
        color: #38bdf8;
        margin: 0 0 3px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .subtitle {
        font-size: 10.5px;
        color: #94a3b8;
        margin: 0 0 10px 0;
      }
      
      .meta-grid {
        font-size: 8.5px;
        color: #cbd5e1;
        border-top: 1px solid #334155;
        padding-top: 6px;
        margin-top: 6px;
      }
      
      h2 {
        font-size: 12px;
        color: #0f172a;
        border-bottom: 2px solid #0284c7;
        padding-bottom: 3px;
        margin-top: 14px;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      
      h3 {
        font-size: 10.5px;
        color: #0369a1;
        margin-top: 10px;
        margin-bottom: 3px;
      }
      
      p {
        margin-bottom: 6px;
        text-align: justify;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 4px;
        margin-bottom: 10px;
        font-size: 8.5px;
      }
      
      th {
        background-color: #f1f5f9;
        color: #0f172a;
        font-weight: bold;
        text-align: left;
        padding: 5px 7px;
        border: 1px solid #cbd5e1;
      }
      
      td {
        padding: 4px 7px;
        border: 1px solid #e2e8f0;
        vertical-align: top;
      }
      
      tr:nth-child(even) td {
        background-color: #f8fafc;
      }
      
      .badge {
        display: inline-block;
        padding: 1px 4px;
        font-size: 8px;
        font-weight: bold;
        border-radius: 3px;
        background-color: #e0f2fe;
        color: #0369a1;
      }
      
      .badge-sec {
        background-color: #fee2e2;
        color: #b91c1c;
      }
      
      .badge-agent {
        background-color: #fef3c7;
        color: #b45309;
      }
      
      .card {
        background-color: #f8fafc;
        border-left: 3px solid #0284c7;
        padding: 6px 10px;
        margin-bottom: 7px;
        border-radius: 0 4px 4px 0;
      }
      
      ul {
        margin: 3px 0 6px 16px;
        padding: 0;
      }
      
      li {
        margin-bottom: 3px;
      }
    </style>
    </head>
    <body>
      <div class="header-banner">
        <div class="title">DHARMARAKSHA / NEXUS</div>
        <div class="subtitle">Comprehensive Technical Architecture &amp; System Overview</div>
        <div class="meta-grid">
          <b>Platform:</b> Multi-Agent AI Legal Tribunal &amp; Investigation System &nbsp;|&nbsp; 
          <b>Jurisdiction:</b> Indian Legal Framework &nbsp;|&nbsp; 
          <b>Date:</b> """ + datetime.datetime.now().strftime("%B %d, %Y") + """
        </div>
      </div>

      <h2>1. Executive Summary</h2>
      <p>
        <b>DHARMARAKSHA (NEXUS)</b> is an enterprise-grade agentic AI platform specialized in Indian jurisprudence (IPC/BNS, IT Act 2000, DPDP Act 2023, Labor Laws, Commercial Contracts, Property Acts). The system ingests inputs across multiple omnichannel interfaces (Telegram, WhatsApp, Web, Voice notes, Camera feeds, IoT sensors), subjects them to a strict <b>7-layer security shield</b>, executes a <b>50-agent deliberative tribunal</b> powered by Google Gemini, visualizes deliberations live inside an interactive <b>3D virtual courtroom (Three.js)</b>, and generates legally cited reference reports.
      </p>

      <h2>2. Complete Technology Stack Matrix</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 22%;">System Layer</th>
            <th style="width: 40%;">Core Technologies &amp; Frameworks</th>
            <th style="width: 38%;">Key Role &amp; Implementation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>Backend &amp; Microservices</b></td>
            <td>Node.js, TypeScript (v5.3+), Express (v4.21), WebSockets (ws v8.16), Multer</td>
            <td>HTTP REST API routing, real-time bidirectional WebSocket event streaming, document upload pipelines.</td>
          </tr>
          <tr>
            <td><b>AI &amp; Reasoning Core</b></td>
            <td>Google Gemini API (<code>@google/generative-ai</code>), Gemini 2.5 Flash Lite</td>
            <td>Multi-agent LLM reasoning, multimodal OCR, multilingual speech-to-text translation, and legal synthesis.</td>
          </tr>
          <tr>
            <td><b>Frontend &amp; 3D UI</b></td>
            <td>React 19, TypeScript, Vite, Three.js, React Three Fiber, Drei, CSS Modules</td>
            <td>Full 3D interactive virtual courtroom, real-time avatar animation, audio/visual cues, live transcript timeline.</td>
          </tr>
          <tr>
            <td><b>Local Persistence</b></td>
            <td>SQLite (<code>better-sqlite3</code>) with Write-Ahead Logging (WAL mode)</td>
            <td>Zero-latency local storage for sessions, timeline events, agent outputs, and risk logs in <code>nexus.db</code>.</td>
          </tr>
          <tr>
            <td><b>Cloud Persistence</b></td>
            <td>Supabase (PostgreSQL), Firebase Realtime DB, Firebase Storage</td>
            <td>Cloud session backup (<code>nexus_sessions</code> table), real-time POS verdict synchronization, PDF asset hosting.</td>
          </tr>
          <tr>
            <td><b>Omnichannel Gateways</b></td>
            <td>Telegram Bot API (<code>node-telegram-bot-api</code>), WhatsApp Webhook API</td>
            <td>User onboarding wizard, file ingestion, human-in-the-loop approvals, and multilingual verdict delivery.</td>
          </tr>
          <tr>
            <td><b>Document &amp; Vision</b></td>
            <td>Python PyMuPDF (<code>fitz</code>), YOLOv8 (<code>ultralytics</code>), OpenCV, <code>pdf-parse</code>, <code>adm-zip</code></td>
            <td>High-fidelity legal PDF report generation, person/document computer vision, multi-format doc parsing.</td>
          </tr>
          <tr>
            <td><b>Integrations &amp; IoT</b></td>
            <td>Composio SDK (Google Sheets/Drive/Calendar), Nodemailer, ESP8266/NodeMCU</td>
            <td>Automated Google Drive archiving, automated calendar event scheduling, email alerts, physical IoT alarm actuators.</td>
          </tr>
        </tbody>
      </table>

      <h2>3. End-to-End System Lifecycle &amp; Dataflow</h2>
      <div class="card">
        <b>Stage 1 &mdash; Omnichannel Ingestion:</b>
        Queries or evidence arrive via Telegram (/investigate or file upload), WhatsApp, Web Chat (/chat), voice recordings, or camera feeds from the Python vision listener.
      </div>
      <div class="card">
        <b>Stage 2 &mdash; 7-Layer Security Shield:</b>
        Incoming text is screened sequentially for prompt injections, jailbreaks (DAN/god-mode), social engineering, Unicode obfuscation, system prompt extraction, and sensitive PII. Blocked queries trigger instant criminal alert notices under Section 66 of the IT Act.
      </div>
      <div class="card">
        <b>Stage 3 &mdash; Dynamic Agent Routing &amp; Classification:</b>
        The input is categorized (e.g., legal contract vs. general inquiry) to dynamically select relevant specialist agents from the 50-agent registry.
      </div>
      <div class="card">
        <b>Stage 4 &mdash; 4-Layer Deliberative Multi-Agent Execution:</b>
        <ul>
          <li><b>Layer 0 (Security):</b> Parallel scan by Fraud Detector, Misinfo Checker, Deepfake Detector, Propaganda Detector, and Conflict of Interest agents.</li>
          <li><b>Layer 1 (Specialists):</b> Parallel research across constitutional, corporate, labor, property, and cyber law agents alongside financial analysts.</li>
          <li><b>Layer 2 (Adversarial Debate):</b> Prosecution, Defense, and Devil's Advocate agents stress-test arguments and surface loopholes.</li>
          <li><b>Risk Gate (Human-in-the-Loop):</b> If any agent reports a Risk Score &ge; 7, execution automatically pauses, dispatching an interactive approval request to Telegram and the dashboard.</li>
          <li><b>Layer 3 (Supreme Judge):</b> The Supreme Judge synthesizes all findings, cross-references Indian precedent cases (&ge;80% relevance), and issues a binding structured verdict.</li>
        </ul>
      </div>
      <div class="card">
        <b>Stage 5 &mdash; Live 3D Courtroom Streaming:</b>
        Every agent activation, speech bubble, confidence shift, and timeline event is broadcast over WebSockets to the Three.js 3D courtroom in real time.
      </div>
      <div class="card">
        <b>Stage 6 &mdash; Report Generation &amp; Multichannel Delivery:</b>
        The system renders a PDF legal document via PyMuPDF, uploads it to cloud storage, syncs metadata to Supabase/SQLite/Firebase, and delivers direct notifications via Gmail, WhatsApp, and audio voice synthesis.
      </div>

      <h2>4. 50-Agent Multi-Agent Registry Architecture</h2>
      <p>The system orchestrates 50 specialized agents structured across 6 operational categories:</p>
      <table>
        <thead>
          <tr>
            <th style="width: 25%;">Category</th>
            <th style="width: 15%;">Agent Count</th>
            <th style="width: 60%;">Representative Agents &amp; Capabilities</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge badge-sec">Security</span></td>
            <td><b>6 Agents</b></td>
            <td>Fraud Detector, Misinformation Checker, Deepfake Detector, Propaganda Detector, Conflict of Interest, Manipulation Checker.</td>
          </tr>
          <tr>
            <td><span class="badge">Research</span></td>
            <td><b>8 Agents</b></td>
            <td>Finance Analyst, Corporate Analyst, Tax Specialist, Due Diligence, Market Intelligence, Regulatory Analyst, Forensic Auditor, Compliance Auditor.</td>
          </tr>
          <tr>
            <td><span class="badge">Legal</span></td>
            <td><b>10 Agents</b></td>
            <td>Constitutional Scholar, Criminal Law Specialist, Contract Lawyer, Labor Law Expert, Intellectual Property Lawyer, Cyber Law Specialist, Family Law Expert, Property Law Specialist, Arbitration Counsel, Human Rights Advocate.</td>
          </tr>
          <tr>
            <td><span class="badge">Deep Analysis</span></td>
            <td><b>8 Agents</b></td>
            <td>Risk Assessor, Evidence Corroborator, Precedent Analyst, Causation Investigator, Statutory Interpreter, Jurisdictional Analyst, Quantum/Damages Assessor, Procedural Auditor.</td>
          </tr>
          <tr>
            <td><span class="badge badge-agent">Adversarial Debate</span></td>
            <td><b>6 Agents</b></td>
            <td>Prosecutor / Petitioner, Defense Counsel, Devil's Advocate, Public Interest Counsel, Amicus Curiae, Supreme Judge.</td>
          </tr>
          <tr>
            <td><span class="badge">Indian Context</span></td>
            <td><b>12 Agents</b></td>
            <td>Panchayat &amp; Customary Law, Land Records &amp; Patta, Consumer Protection (CCPA), RERA &amp; Real Estate, MSME &amp; Labor Court, Banking &amp; SARFAESI, Motor Accidents (MACT), Cyber Cell &amp; IT Act, RTI &amp; Lokpal, Environmental (NGT), Taxation (GST/ITAT), Matrimonial (HMA/SMA).</td>
          </tr>
        </tbody>
      </table>

      <h2>5. Multilingual &amp; Accessibility Capabilities</h2>
      <p>
        The platform features native multi-language voice and text processing tailored for Indian demographics:
      </p>
      <ul>
        <li><b>Supported Languages:</b> English, Hindi, Kannada, Tamil, Telugu.</li>
        <li><b>Voice Notes &amp; Speech:</b> Ingests spoken voice notes via Telegram or web microphone, translates and transcribes via Gemini multimodal audio processing.</li>
        <li><b>Simplified Verdict Explainer:</b> Generates accessible, jargon-free 2-3 sentence audio explanations for low-literacy users through <code>/api/explain-verdict</code>.</li>
      </ul>

      <h2>6. Physical Hardware &amp; IoT Integration</h2>
      <p>
        DHARMARAKSHA interfaces with real-world environments through IoT microcontrollers:
      </p>
      <ul>
        <li><b>Microcontroller:</b> ESP8266 / NodeMCU running C++ Arduino firmware (<code>nodemcu_firebase.ino</code>).</li>
        <li><b>Sensors:</b> Temperature threshold monitoring, vibration sensors, PIR motion detectors for secure evidence rooms.</li>
        <li><b>Actuation:</b> Real-time alert buzzers and hardware indicators triggered via Firebase Realtime Database actuator paths.</li>
        <li><b>Smart Vision:</b> Mobile camera streaming with YOLOv8 object/document detection to initiate hands-free legal tribunal reviews.</li>
      </ul>
    </body>
    </html>
    """

    temp_pdf_path = OUTPUT_PATH + ".temp.pdf"
    writer = fitz.DocumentWriter(temp_pdf_path)
    story = fitz.Story(html=html_content)
    
    rect = fitz.Rect(40, 42, 555, 775)
    page_num = 1
    more = 1
    
    while more:
        dev = writer.begin_page(fitz.paper_rect("a4"))
        more, _ = story.place(rect)
        story.draw(dev)
        writer.end_page()
        page_num += 1

    writer.close()
    
    # Read temp pdf and add footers
    final_doc = fitz.open(temp_pdf_path)
    total_pages = len(final_doc)
    
    for i, page in enumerate(final_doc):
        # Top line & Bottom line
        page.draw_line(fitz.Point(40, 30), fitz.Point(555, 30), color=(0.85, 0.88, 0.92), width=0.75)
        page.draw_line(fitz.Point(40, 795), fitz.Point(555, 795), color=(0.85, 0.88, 0.92), width=0.75)
        
        # Header text
        tw_header = fitz.TextWriter(page.rect)
        tw_header.append((40, 24), "DHARMARAKSHA / NEXUS — Tech Stack & Architecture Overview", font=fitz.Font("Helvetica-Bold"), fontsize=7.5)
        tw_header.write_text(page, color=(0.3, 0.4, 0.5))
        
        # Footer text
        tw_footer = fitz.TextWriter(page.rect)
        tw_footer.append((40, 810), "CONFIDENTIAL & PROPRIETARY — Multi-Agent AI Legal Tribunal System", font=fitz.Font("Helvetica"), fontsize=7.5)
        tw_footer.append((500, 810), f"Page {i + 1} of {total_pages}", font=fitz.Font("Helvetica-Bold"), fontsize=7.5)
        tw_footer.write_text(page, color=(0.4, 0.45, 0.5))

    final_doc.save(OUTPUT_PATH)
    final_doc.close()
    del final_doc
    import gc
    gc.collect()
    
    try:
        if os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)
    except Exception:
        pass
        
    print(f"PDF generated successfully at: {OUTPUT_PATH}")

if __name__ == "__main__":
    generate_pdf()
