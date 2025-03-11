const vscode = require("vscode");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = "api_key"; // 🔥 Replace with your actual Gemini API Key

const genAI = new GoogleGenerativeAI(API_KEY);
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
  const result = await model.generateContent(prompt);
  const timestamp = `// Generated on: ${getTimeStamp()}\n`;
  return (
    timestamp +
    result.response.text().replace("```javascript", "").replace("```", "")
  );
}

function activate(context) {
  // ✅ Generate Code
  let generateCodeDisposable = vscode.commands.registerCommand(
    "notagpt.generateCode",
    async function () {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("Open a file first!");
        return;
      }
      vscode.window.showInformationMessage("✅ Generating your code");

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

      const prompt = systemPrompt.replace("{text}", text);

      const generatedCode = await callGeminiAPI(prompt);

      editor.edit((editBuilder) => {
        editBuilder.replace(editor.selection, generatedCode);
      });

      vscode.window.showInformationMessage("✅ Code Generated Successfully!");
    }
  );

  // ✅ Explain Code
  let explainCodeDisposable = vscode.commands.registerCommand(
    "notagpt.explainCode",
    async function () {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("Open a file first!");
        return;
      }

      const text = editor.document.getText(editor.selection);
      const prompt = `Explain this code in simple English: ${text}`;

      vscode.window.showInformationMessage("💡 Explaining Code...");

      const explanation = await callGeminiAPI(prompt);

      const timestamp = `// Explained on: ${getTimeStamp()}\n`;
      vscode.window.showInformationMessage(`${timestamp}${explanation}`);
    }
  );

  // ✅ Refactor Code
  let refactorCodeDisposable = vscode.commands.registerCommand(
    "notagpt.refactorCode",
    async function () {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("Open a file first!");
        return;
      }

      const text = editor.document.getText(editor.selection);
      const prompt = `Refactor this code for better performance: ${text}`;

      vscode.window.showInformationMessage("♻️ Refactoring Code...");

      const refactoredCode = await callGeminiAPI(prompt);

      editor.edit((editBuilder) => {
        editBuilder.replace(editor.selection, refactoredCode);
      });

      vscode.window.showInformationMessage("✅ Code Refactored Successfully!");
    }
  );

  // ✅ Generate Test Case
  let generateTestCaseDisposable = vscode.commands.registerCommand(
    "notagpt.generateTestCase",
    async function () {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("Open a file first!");
        return;
      }

      const text = editor.document.getText(editor.selection);
      const prompt = `Generate test cases for this code: ${text}`;

      vscode.window.showInformationMessage("✅ Generating Test Cases...");

      const testCases = await callGeminiAPI(prompt);

      const timestamp = `// Test Cases generated on: ${getTimeStamp()}\n`;
      editor.edit((editBuilder) => {
        editBuilder.insert(
          editor.selection.end,
          `\n\n${timestamp}${testCases}`
        );
      });

      vscode.window.showInformationMessage(
        "✅ Test Cases Generated Successfully!"
      );
    }
  );

  context.subscriptions.push(generateCodeDisposable);
  context.subscriptions.push(explainCodeDisposable);
  context.subscriptions.push(refactorCodeDisposable);
  context.subscriptions.push(generateTestCaseDisposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
