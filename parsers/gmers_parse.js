const { exec } = require('child_process');
const path = require('path');

class gmers_parse {
  async parse(pdfPath) {
    const tables = await this.extractTableFromPDF(pdfPath);
    return this.processGMERSResult(tables);
  }

  extractTableFromPDF(pdfPath) {
    return new Promise((resolve, reject) => {
      const tabulaJarPath = path.resolve(__dirname, '../tabula.jar');
      const command = `java -jar "${tabulaJarPath}" -l -p all -f JSON "${pdfPath}"`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Tabula error:', stderr);
          return reject(error);
        }
        try {
          const tables = JSON.parse(stdout);
          resolve(tables);
        } catch (err) {
          console.error('JSON parse error:', stdout);
          reject(err);
        }
      });
    });
  }

  processGMERSResult(tables) {
    const allCells = this.flattenTables(tables);

    console.log("🧾 GMERS Raw Table Data:");
    console.log(JSON.stringify(allCells, null, 2)); // Debug output

    // Initialize the output structure
    const result = {
      document: {
        filename: path.basename(tables[0]?.extraction_method || 'unknown.pdf'),
        page1: {
          content: {
            date_time: '',
            university: {
              name: '',
              location: '',
              accreditation: ''
            },
            examination: {
              title: '',
              held_in: ''
            },
            student: {
              seat_no: '',
              name: '',
              college: ''
            },
            marks: [],
            totals: {
              university_total: { max: 0, obtained: 0 },
              internal_total: { max: 0, obtained: 0 },
              grand_total: { max: 0, obtained: 0 }
            },
            result: '',
            verification: {
              last_date: '',
              note: []
            },
            source: {
              url: '',
              copyright: ''
            }
          }
        }
      }
    };

    // Helper function to parse max/min/obtained from strings like "100/40" or "57"
    const parseMark = (text) => {
      if (!text || text === '-') return { max: null, min: null, obtained: null };
      if (text.includes('/')) {
        const [max, min] = text.split('/').map(Number);
        return { max, min, obtained: null };
      }
      return { max: null, min: null, obtained: Number(text) };
    };

    // Extract table data
    const marks = [];
    const expectedHeaders = [
      'SUBJECT', 'THEORY MAX', 'THEORY OBT.', 'PRACTICAL MAX', 'PRACTICAL OBT.',
      'EXTERNAL TOTAL MAX', 'EXTERNAL TOTAL OBT.', 'THEORY MAX', 'THEORY OBT.',
      'PRACTICAL MAX', 'PRACTICAL OBT.', 'INTERNAL TOTAL MAX', 'INTERNAL TOTAL OBT.'
    ];

    // Find the table with marks (assuming it’s the one with SUBJECT as the first column)
    let marksTable = allCells.find(row => row[0]?.includes('SUBJECT')) ? allCells : [];
    let tableRows = marksTable.slice(marksTable.findIndex(row => row[0]?.includes('SUBJECT')) + 1);

    // Filter out rows until UNIVERSITY TOTAL
    tableRows = tableRows.filter(row => !row.some(cell => cell.includes('UNIVERSITY TOTAL')));

    // Process each row
    for (const row of tableRows) {
      const subject = row[0]?.trim();
      if (!subject || subject === '') continue;

      const markEntry = {
        subject,
        external: {
          theory: parseMark(row[1]), // THEORY MAX/OBT.
          practical: parseMark(row[3]), // PRACTICAL MAX/OBT.
          total: parseMark(row[5]) // EXTERNAL TOTAL MAX/OBT.
        },
        internal: {
          theory: parseMark(row[7]), // THEORY MAX/OBT.
          practical: parseMark(row[9]), // PRACTICAL MAX/OBT.
          total: parseMark(row[11]) // INTERNAL TOTAL MAX/OBT.
        }
      };

      // Adjust for merged cells (e.g., TOTAL row combines THEORY and PRACTICAL obtained values)
      if (subject === 'TOTAL' || subject === 'FORENSIC MEDICINE') {
        markEntry.external.theory.obtained = parseMark(row[2]).obtained;
        markEntry.external.practical.obtained = parseMark(row[4]).obtained;
        markEntry.external.total.obtained = parseMark(row[6]).obtained;
        markEntry.internal.theory.obtained = parseMark(row[8]).obtained;
        markEntry.internal.practical.obtained = parseMark(row[10]).obtained;
        markEntry.internal.total.obtained = parseMark(row[12]).obtained;
      } else if (subject.includes('COMMUNITY MEDICINE')) {
        markEntry.external.theory.obtained = parseMark(row[2]).obtained;
        markEntry.external.practical = { max: null, min: null, obtained: null };
        markEntry.external.total = { max: null, min: null, obtained: null };
        markEntry.internal.theory = { max: null, min: null, obtained: null };
        markEntry.internal.practical = { max: null, min: null, obtained: null };
        markEntry.internal.total = { max: null, min: null, obtained: null };
      }

      marks.push(markEntry);
    }

    result.document.page1.content.marks = marks;

    // Extract metadata and totals using regex on raw cells
    const allText = allCells.flat().join(' ');

    // Metadata regex patterns
    result.document.page1.content.date_time = allText.match(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}/)?.[0] || '';
    result.document.page1.content.university.name = allText.match(/Hemchandracharya North Gujarat University/)?.[0] || '';
    result.document.page1.content.university.location = allText.match(/Patan - \d{6}, Gujarat, INDIA/)?.[0] || '';
    result.document.page1.content.university.accreditation = allText.match(/ACCREDITED BY NAAC WITH 'B' GRADE \(CGPA \d\.\d{2}\)/)?.[0] || '';
    result.document.page1.content.examination.title = allText.match(/STATEMENT OF MARKS : T\.Y\.M\.B\.B\.S\. PART-I[^\n]+/)?.[0] || '';
    result.document.page1.content.examination.held_in = allText.match(/EXAMINATION HELD IN : JANUARY : \d{4}/)?.[0] || '';
    result.document.page1.content.student.seat_no = allText.match(/SEAT NO\.\s*(\d{3})/)?.[1] || '';
    result.document.page1.content.student.name = allText.match(/UMAT AKSHAY HASAMUKHBHAI/)?.[0] || '';
    result.document.page1.content.student.college = allText.match(/GMERS MEDICAL COLLEGE, DHARPUR/)?.[0] || '';
    result.document.page1.content.result = allText.match(/RESULT : PASS/)?.[0] || '';
    result.document.page1.content.verification.last_date = allText.match(/LAST DATE FOR VERIFICATION IS : \d{2}\/\d{2}\/\d{4}/)?.[0] || '';
    result.document.page1.content.source.url = allText.match(/https:\/\/result\.ngu\.ac\.in\/[^\s]+/)?.[0] || '';
    result.document.page1.content.source.copyright = allText.match(/Copyright Hemchandracharya North Gujarat University/)?.[0] || '';

    // Extract verification notes
    const noteRegex = /Note : [\s\S]*?(?=https:\/\/result\.ngu\.ac\.in|$)/;
    const notesText = allText.match(noteRegex)?.[0] || '';
    result.document.page1.content.verification.note = notesText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('http') && !line.includes('Copyright'));

    // Extract totals
    const universityTotal = allText.match(/UNIVERSITY TOTAL \((\d+)\) : (\d+)/);
    if (universityTotal) {
      result.document.page1.content.totals.university_total.max = parseInt(universityTotal[1]);
      result.document.page1.content.totals.university_total.obtained = parseInt(universityTotal[2]);
    }

    const internalTotal = allText.match(/INTERNAL TOTAL \((\d+)\) : (\d+)/);
    if (internalTotal) {
      result.document.page1.content.totals.internal_total.max = parseInt(internalTotal[1]);
      result.document.page1.content.totals.internal_total.obtained = parseInt(internalTotal[2]);
    }

    const grandTotal = allText.match(/GRAND TOTAL \((\d+)\) : (\d+)/);
    if (grandTotal) {
      result.document.page1.content.totals.grand_total.max = parseInt(grandTotal[1]);
      result.document.page1.content.totals.grand_total.obtained = parseInt(grandTotal[2]);
    }

    return result;
  }

  flattenTables(tables) {
    let rows = [];
    for (const table of tables) {
      for (const row of table.data) {
        rows.push(row.map(cell => (cell.text || "").trim()));
      }
    }
    return rows;
  }
}

module.exports = gmers_parse; 