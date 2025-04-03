//modify this code into simpler
const vscode = require("vscode");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyD-D-w1FvNco3QzXoRBqeSiQYmNPUqVzpg");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

function getTimeStamp() {
  const now = new Date();
  return now.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

async function callGeminiAPI(prompt) {
  try {
    const result = await model.generateContent(prompt);
    return result.response
      .text()
      .replace("```javascript", "")
      .replace("```", "")
      .replace("```python", "");
  } catch (error) {
    throw new Error(`API Error: ${error.message}`);
  }
}

class NotagptSidebarProvider {
  constructor() {
    this._view = null;
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;

    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = getWebviewContent();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      let result = "";
      const text = getSelectedText();
      const systemPrompt = `
        {instruction} strictly based on this input: {text}.  
        
        ### Output Format Rules:  
        1. **Provide ONLY the functional, executable code or relevant output.**  
        2. **Any non-executable text, logs, or output** must:  
           - Be enclosed in /* */  
           - Example: /* Server running on port 3000 */  
        3. **Terminal commands** must:  
           - Be enclosed in /* */  
           - Example: /* npm install express */  
        4. **Do NOT include any explanations, descriptions, or comments** except within /* */  
        
        ### Example of Acceptable Output:  
        /* npm install express */  
        /* node server.js */  
        
        const express = require('express');  
        const app = express();  
        const port = 3000;  
        
        app.get('/', (req, res) => {  
          res.send('Hello World!');  
        });  
        
        app.listen(port, () => {  
          /* Server running on port 3000 */  
        });
        `;

      try {
        switch (message.command) {
          case "generateCode":
            vscode.window.showInformationMessage("✅ Generating your code...");
            result = await callGeminiAPI(
              systemPrompt
                .replace("{instruction}", "Generate code")
                .replace("{text}", text)
            );
            vscode.window.showInformationMessage(
              "✅ Code generation completed!"
            );
            break;
          case "explainCode":
            vscode.window.showInformationMessage("✅ Explaining your code...");
            result = await callGeminiAPI(
              `Explain this code in simple English: ${text}`
            );
            vscode.window.showInformationMessage(
              "✅ Code explanation completed!"
            );
            break;
          case "refactorCode":
            vscode.window.showInformationMessage("✅ Refactoring your code...");
            result = await callGeminiAPI(
              systemPrompt
                .replace(
                  "{instruction}",
                  "Refactor this code for better performance"
                )
                .replace("{text}", text)
            );
            vscode.window.showInformationMessage(
              "✅ Code refactoring completed!"
            );
            break;
          case "generateTestCase":
            vscode.window.showInformationMessage("✅ Generating test cases...");
            result = await callGeminiAPI(
              systemPrompt
                .replace("{instruction}", "Generate test cases for this code")
                .replace("{text}", text)
            );
            vscode.window.showInformationMessage(
              "✅ Test case generation completed!"
            );
            break;
        }
      } catch (error) {
        result = `/* Error: ${error.message} */\n/* Please check your API key or network connection. */`;
        vscode.window.showErrorMessage(`❌ ${error.message}`);
      }

      webviewView.webview.postMessage({
        command: "displayResult",
        content: result,
      });
    });
  }
}

function activate(context) {
  // Register sidebar provider
  const sidebarProvider = new NotagptSidebarProvider();
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "notagpt-sidebar",
      sidebarProvider
    )
  );

  // ✅ Generate Code
  let generateCodeDisposable = vscode.commands.registerCommand(
    "notagpt.generateCode",
    async function () {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("⚠️ Open a file first!");
        return;
      }
      vscode.window.showInformationMessage("✅ Generating your code...");

      const text = editor.document
        .getText(editor.selection)
        .replace(/\n/g, "") // Remove newlines
        .trim(); // Remove extra spaces

      const systemPrompt = `
        Generate code strictly based on this input: {text}.  
        
        ### Output Format Rules:  
        1. **Provide ONLY the functional, executable code.**  
        2. **Any non-executable text, logs, or output** must:  
           - Be enclosed in /* */  
           - Example: /* Server running on port 3000 */  
        3. **Terminal commands** must:  
           - Be enclosed in /* */  
           - Example: /* npm install express */  
        4. **Do NOT include any explanations, descriptions, or comments** except within /* */  
        
        ### Example of Acceptable Output:  
        /* npm install express */  
        /* node server.js */  
        
        const express = require('express');  
        const app = express();  
        const port = 3000;  
        
        app.get('/', (req, res) => {  
          res.send('Hello World!');  
        });  
        
        app.listen(port, () => {  
          /* Server running on port 3000 */  
        });
        `;

      let result;
      try {
        result = await callGeminiAPI(systemPrompt.replace("{text}", text));
        editor.edit((editBuilder) => {
          editBuilder.replace(editor.selection, result);
        });
        vscode.window.showInformationMessage("✅ Code Generated Successfully!");
      } catch (error) {
        result = `/* Error: ${error.message} */\n/* Please check your API key or network connection. */`;
        editor.edit((editBuilder) => {
          editBuilder.replace(editor.selection, result);
        });
        vscode.window.showErrorMessage(`❌ ${error.message}`);
      }
    }
  );

  // ✅ Explain Code
  let explainCodeDisposable = vscode.commands.registerCommand(
    "notagpt.explainCode",
    async function () {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("⚠️ Open a file first!");
        return;
      }

      const text = editor.document.getText(editor.selection);
      const prompt = `Explain this code in simple English: ${text}`;

      vscode.window.showInformationMessage("💡 Explaining Code...");

      let result;
      try {
        result = await callGeminiAPI(prompt);
        const timestamp = `// Explained on: ${getTimeStamp()}\n`;
        vscode.workspace
          .openTextDocument({ content: `${timestamp}${result}` })
          .then((doc) => vscode.window.showTextDocument(doc));
        vscode.window.showInformationMessage("✅ Code Explanation Completed!");
      } catch (error) {
        result = `/* Error: ${error.message} */\n/* Please check your API key or network connection. */`;
        const timestamp = `// Explained on: ${getTimeStamp()}\n`;
        vscode.workspace
          .openTextDocument({ content: `${timestamp}${result}` })
          .then((doc) => vscode.window.showTextDocument(doc));
        vscode.window.showErrorMessage(`❌ ${error.message}`);
      }
    }
  );

  // ✅ Refactor Code
  let refactorCodeDisposable = vscode.commands.registerCommand(
    "notagpt.refactorCode",
    async function () {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("⚠️ Open a file first!");
        return;
      }

      const text = editor.document.getText(editor.selection);
      const systemPrompt = `
        Refactor this code for better performance strictly based on this input: {text}.  
        
        ### Output Format Rules:  
        1. **Provide ONLY the functional, executable code.**  
        2. **Any non-executable text, logs, or output** must:  
           - Be enclosed in /* */  
           - Example: /* Server running on port 3000 */  
        3. **Terminal commands** must:  
           - Be enclosed in /* */  
           - Example: /* npm install express */  
        4. **Do NOT include any explanations, descriptions, or comments** except within /* */  
        
        ### Example of Acceptable Output:  
        /* npm install express */  
        /* node server.js */  
        
        const express = require('express');  
        const app = express();  
        const port = 3000;  
        
        app.get('/', (req, res) => {  
          res.send('Hello World!');  
        });  
        
        app.listen(port, () => {  
          /* Server running on port 3000 */  
        });
        `;

      vscode.window.showInformationMessage("♻️ Refactoring Code...");

      let result;
      try {
        result = await callGeminiAPI(systemPrompt.replace("{text}", text));
        editor.edit((editBuilder) => {
          editBuilder.replace(editor.selection, result);
        });
        vscode.window.showInformationMessage(
          "✅ Code Refactored Successfully!"
        );
      } catch (error) {
        result = `/* Error: ${error.message} */\n/* Please check your API key or network connection. */`;
        editor.edit((editBuilder) => {
          editBuilder.replace(editor.selection, result);
        });
        vscode.window.showErrorMessage(`❌ ${error.message}`);
      }
    }
  );

  // ✅ Generate Test Case
  let generateTestCaseDisposable = vscode.commands.registerCommand(
    "notagpt.generateTestCase",
    async function () {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("⚠️ Open a file first!");
        return;
      }

      const text = editor.document.getText(editor.selection);
      const systemPrompt = `
        Generate test cases for this code strictly based on this input: {text}.  
        
        ### Output Format Rules:  
        1. **Provide ONLY the functional, executable code.**  
        2. **Any non-executable text, logs, or output** must:  
           - Be enclosed in /* */  
           - Example: /* Server running on port 3000 */  
        3. **Terminal commands** must:  
           - Be enclosed in /* */  
           - Example: /* npm install express */  
        4. **Do NOT include any explanations, descriptions, or comments** except within /* */  
        
        ### Example of Acceptable Output:  
        /* npm install express */  
        /* node server.js */  
        
        const express = require('express');  
        const app = express();  
        const port = 3000;  
        
        app.get('/', (req, res) => {  
          res.send('Hello World!');  
        });  
        
        app.listen(port, () => {  
          /* Server running on port 3000 */  
        });
        `;

      vscode.window.showInformationMessage("✅ Generating Test Cases...");

      let result;
      try {
        result = await callGeminiAPI(systemPrompt.replace("{text}", text));
        const timestamp = `// Test Cases generated on: ${getTimeStamp()}\n`;
        editor.edit((editBuilder) => {
          editBuilder.insert(editor.selection.end, `\n\n${timestamp}${result}`);
        });
        vscode.window.showInformationMessage(
          "✅ Test Cases Generated Successfully!"
        );
      } catch (error) {
        result = `/* Error: ${error.message} */\n/* Please check your API key or network connection. */`;
        const timestamp = `// Test Cases generated on: ${getTimeStamp()}\n`;
        editor.edit((editBuilder) => {
          editBuilder.insert(editor.selection.end, `\n\n${timestamp}${result}`);
        });
        vscode.window.showErrorMessage(`❌ ${error.message}`);
      }
    }
  );

  let showPanelDisposable = vscode.commands.registerCommand(
    "notagpt.showPanel",
    function () {
      const panel = vscode.window.createWebviewPanel(
        "notagptPanel",
        "NOTAGPT Panel",
        vscode.ViewColumn.One,
        { enableScripts: true }
      );

      panel.webview.html = getWebviewContent();

      panel.webview.onDidReceiveMessage(async (message) => {
        let result = "";
        const text = getSelectedText();
        const systemPrompt = `
          {instruction} strictly based on this input: {text}.  
          
          ### Output Format Rules:  
          1. **Provide ONLY the functional, executable code or relevant output.**  
          2. **Any non-executable text, logs, or output** must:  
             - Be enclosed in /* */  
             - Example: /* Server running on port 3000 */  
          3. **Terminal commands** must:  
             - Be enclosed in /* */  
             - Example: /* npm install express */  
          4. **Do NOT include any explanations, descriptions, or comments** except within /* */  
          
          ### Example of Acceptable Output:  
          /* npm install express */  
          /* node server.js */  
          
          const express = require('express');  
          const app = express();  
          const port = 3000;  
          
          app.get('/', (req, res) => {  
            res.send('Hello World!');  
          });  
          
          app.listen(port, () => {  
            /* Server running on port 3000 */  
          });
          `;

        try {
          switch (message.command) {
            case "generateCode":
              vscode.window.showInformationMessage(
                "✅ Generating your code..."
              );
              result = await callGeminiAPI(
                systemPrompt
                  .replace("{instruction}", "Generate code")
                  .replace("{text}", text)
              );
              vscode.window.showInformationMessage(
                "✅ Code generation completed!"
              );
              break;
            case "explainCode":
              vscode.window.showInformationMessage(
                "✅ Explaining your code..."
              );
              result = await callGeminiAPI(
                `Explain this code in simple English: ${text}`
              );
              vscode.window.showInformationMessage(
                "✅ Code explanation completed!"
              );
              break;
            case "refactorCode":
              vscode.window.showInformationMessage(
                "✅ Refactoring your code..."
              );
              result = await callGeminiAPI(
                systemPrompt
                  .replace(
                    "{instruction}",
                    "Refactor this code for better performance"
                  )
                  .replace("{text}", text)
              );
              vscode.window.showInformationMessage(
                "✅ Code refactoring completed!"
              );
              break;
            case "generateTestCase":
              vscode.window.showInformationMessage(
                "✅ Generating test cases..."
              );
              result = await callGeminiAPI(
                systemPrompt
                  .replace("{instruction}", "Generate test cases for this code")
                  .replace("{text}", text)
              );
              vscode.window.showInformationMessage(
                "✅ Test case generation completed!"
              );
              break;
          }
        } catch (error) {
          result = `/* Error: ${error.message} */\n/* Please check your API key or network connection. */`;
          vscode.window.showErrorMessage(`❌ ${error.message}`);
        }

        panel.webview.postMessage({
          command: "displayResult",
          content: result,
        });
      });
    }
  );

  context.subscriptions.push(
    sidebarProvider,
    generateCodeDisposable,
    explainCodeDisposable,
    refactorCodeDisposable,
    generateTestCaseDisposable,
    showPanelDisposable
  );
}

function getSelectedText() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return "";
  }
  return editor.document.getText(editor.selection);
}

function getWebviewContent() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NOTAGPT Panel 3:30</title>
  <style>
    body {
      font-family: 'Poppins', sans-serif;
      background-color: #1e1e2e;
      color: #ffffff;
      text-align: center;
      padding: 40px;
    }
    .container {
      display: flex;
      flex-direction: column;
      gap: 15px;
      align-items: center;
    }
    .btn {
      background: linear-gradient(135deg, #ff7eb3, #ff758c);
      color: white;
      border: none;
      padding: 12px 25px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.3s ease-in-out;
      box-shadow: 0 4px 6px rgba(255, 118, 136, 0.3);
    }
    .btn:hover {
      transform: translateY(-3px);
      background: linear-gradient(135deg, #ff758c, #ff7eb3);
      box-shadow: 0 6px 12px rgba(255, 118, 136, 0.5);
    }
    .output-container {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 20px;
    }
    .output {
      padding: 15px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      min-height: 150px;
      white-space: pre-wrap;
      box-shadow: 0 4px 8px rgba(255, 255, 255, 0.1);
      width: 80%;
      max-width: 600px;
      text-align: left;
    }
    .copy-btn {
      margin-top: 10px;
      background: linear-gradient(135deg, #6a85b6, #bac8e0);
      color: white;
      border: none;
      padding: 8px 15px;
      font-size: 14px;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.3s ease-in-out;
      box-shadow: 0 3px 5px rgba(186, 200, 224, 0.3);
    }
    .copy-btn:hover {
      transform: translateY(-2px);
      background: linear-gradient(135deg, #bac8e0, #6a85b6);
      box-shadow: 0 5px 10px rgba(186, 200, 224, 0.5);
    }
    h2 {
      font-size: 24px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <h2>NOTAGPT Panel 3:30 🚀</h2>
  <div class="container">
    <button class="btn" onclick="generateCode()">⚙️ Generate Code</button>
    <button class="btn" onclick="explainCode()">💡 Explain Code</button>
    <button class="btn" onclick="refactorCode()">♻️ Refactor Code</button>
    <button class="btn" onclick="generateTestCase()">🧪 Generate Test Cases</button>
  </div>

  <h3>📜 Output:</h3>
  <div class="output-container">
    <div class="output" id="output"><p>Select some code & click a button</p></div>
    <button class="copy-btn" onclick="copyOutput()">📋 Copy</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function generateCode() { vscode.postMessage({ command: "generateCode" }); }
    function explainCode() { vscode.postMessage({ command: "explainCode" }); }
    function refactorCode() { vscode.postMessage({ command: "refactorCode" }); }
    function generateTestCase() { vscode.postMessage({ command: "generateTestCase" }); }

    window.addEventListener("message", (event) => {
      const message = event.data;
      if (message.command === "displayResult") {
        document.getElementById("output").innerHTML = "<pre>" + message.content + "</pre>";
      }
    });

    function copyOutput() {
      const outputText = document.getElementById("output").innerText;
      navigator.clipboard.writeText(outputText).then(() => {
        const copyBtn = document.querySelector(".copy-btn");
        copyBtn.textContent = "✅ Copied!";
        setTimeout(() => copyBtn.textContent = "📋 Copy", 1500);
      }).catch(err => {
        console.error("Failed to copy: ", err);
      });
    }
  </script>

</body>
</html>


  `;
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
