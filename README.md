# SmartBuild Estimator

**SmartBuild Estimator** is a complete, modern SaaS startup MVP designed to help homeowners plan residential construction budgets with confidence and seamlessly connect with verified local builders for final quotations.

---

## 🚀 Key Features

### 1. Modern SaaS Landing Page (Home)
- **Hero Section**: Sleek construction-tech themed visual mockup displaying real-time rates and dynamic budgets.
- **Features Section**: Explains core functionalities like regional material indexes, quality tiers, and vetted builder matches.
- **Benefits Section**: Detailing value propositions for homeowners, builder partners, and real estate developers/investors.
- **How It Works**: Interactive timeline explaining the step-by-step user journey.

### 2. Interactive Budget Estimator
- **State & District Specificity**: Calculates location-aware rates.
- **Scalable Specifications**: Slider-ready input values for Plot Size (sq.ft) and Construction Area (sq.ft) with customizable floors (1 to 4).
- **Interactive Quality Cards**: Select between **Basic**, **Standard**, and **Premium** materials, dynamically adjusting estimation ranges.
- **Cost Breakdown Visualizer**: Displays structural cost breakdowns for civil labor, materials, design, and government approvals.
- **Disclaimer**: *"This estimate is for planning purposes only and is not a final quotation."*
- **Auto Pre-filling**: Pre-fills the builder quotation request parameters dynamically from the calculator results.

### 3. Builder Quotes Matching
- Vetted contractor lead-gen request form.
- Consent checkbox validation before submission.
- **Interactive Success Modal**: Shows visual details of the submitted request.

### 4. WhatsApp Support Redirection
- Fully integrated support channel.
- Opens a pre-formatted, URL-encoded message directly on WhatsApp in a new tab:
  ```text
  Hello SmartBuild Estimator,
  Name: [User Name]
  Email: [User Email]
  Message: [User Message]
  I would like more information regarding construction budget planning and builder consultation.
  ```
- Strictly redirects via native web integration (no blockable iframes).

### 5. Legal & Company Pages
- **About Us**: Rich startup narrative outlining the vision, transparency mission, and tech stack details.
- **Privacy Policy**: Clear user guidelines on data handling and broker sharing consent.
- **Terms & Conditions**: Standard platform service agreement.

---

## 🎨 Theme & Color Palette
- **Primary Navy Blue**: `#0b132b` (Deep Slate background, text, headers)
- **Accent Orange**: `#f97316` (Primary action CTA buttons, badges, highlights)
- **Supporting Blue**: `#3b82f6` (Secondary progress bars, badges)
- **Soft Light Slate**: `#f8fafc` (Alternating section backgrounds)
- **Modern Typography**: Integrated Google Font `Outfit` & `Plus Jakarta Sans` for clean, professional, and investor-ready visuals.

---

## 🛠️ Tech Stack & Architecture
- **Structure**: Semantic HTML5 (header, main, footer, section, article).
- **Styling**: Vanilla CSS3 (custom variables, grid systems, glassmorphism shadows, keyframe animations, media query responsiveness).
- **Logic & Router**: Vanilla ES6 JavaScript. Includes a client-side hash router (`#/`, `#/estimator`, `#/quotes`, etc.) for seamless page switching without browser reloads.

---

## 💻 How to Run Locally

You can run the application using any static file server.

### Option 1: Using Node http-server (Recommended)
If you have Node.js installed, open your terminal and run:
```bash
npx http-server -p 8080
```
Then visit `http://127.0.0.1:8080` in your web browser.

### Option 2: Python HTTP Server
If you have Python installed, run:
```bash
python -m http.server 8080
```
Then visit `http://127.0.0.1:8080` in your web browser.
