import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import ReactMarkdown from 'react-markdown';
import './App.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

function App() {
  const [formData, setFormData] = useState({
    name: '',
    className: '',
    routine: '',
    deadline: '',
    extra: '',
    syllabusText: ''
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(" ") + " ";
    }
    return text;
  };

  const generatePlan = async () => {
    setLoading(true);
    let finalSyllabus = formData.syllabusText;

    if (file) {
      finalSyllabus = await extractTextFromPDF(file);
    }

    const prompt = `Act as an expert Academic Coach. 
      Student: ${formData.name} (${formData.className})
      Syllabus: ${finalSyllabus}
      Daily Life Routine: ${formData.routine}
      Deadline: ${formData.deadline}
      Extra Context: ${formData.extra}
      Generate a personalized, high-efficiency study schedule. 
      Format the output using Markdown headers, bold text, and tables.
      And provide time management tips. Also suggest useful study resources and if the user wants generate flashcards on a particular topic for better learning.`;

    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await resp.json();
      setResult(data.candidates[0].content.parts[0].text);
    } catch (err) {
      alert("Error generating plan.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="top">
        <h1>AI-study Planner</h1>
      </div>

      <div className="upload">
        <h2>Upload your study materials</h2>
        <div className="form-group">
          <h3>Name:</h3>
          <input type="text" name="name" placeholder="Name" onChange={handleInputChange} />
          <h3>Class:</h3>
          <input type="text" name="className" placeholder="Class" onChange={handleInputChange} />
          
          <h3>Syllabus Content</h3>
          <textarea name="syllabusText" placeholder="Paste syllabus text here..." onChange={handleInputChange} />
          <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} />

          <h3>Daily Routine</h3>
          <textarea name="routine" placeholder="Describe your daily schedule..." onChange={handleInputChange} />
          <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} />

          <h3>Exam Deadline</h3>
          <input type="date" name="deadline" onChange={handleInputChange} />

          <h3>Additional Context</h3>
          <textarea name="extra" placeholder="Any other details..." onChange={handleInputChange} />

          <button onClick={generatePlan} disabled={loading}>
            {loading ? "Generating..." : "Generate Plan"}
          </button>
        </div>
      </div>

      {result && (
        <div className="result-area">
          <h2>Your Study Schedule</h2>
          <div className="markdown-output">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;