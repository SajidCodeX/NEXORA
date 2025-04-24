const { exec } = require('child_process');
const path = require('path');

class so_parse {
  async parse(pdfPath) {
    const tables = await this.extractTableFromPDF(pdfPath);
    return this.processResult(tables);
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

  processResult(tables) {
    const rows = this.flattenTables(tables);
    let studentInfo = {
      enrollmentNumber: "N/A",
      name: "N/A",
      course: "N/A",
      semester: "N/A",
      examName: "N/A",
      session: "N/A",
      institute: "N/A",
      spi: 0,
      cpi: 0,
      resultStatus: "N/A"
    };

    const courses = [];

    rows.forEach(row => {
      const line = row.join(' ').replace(/\s+/g, ' ').trim();

      if (/Student Enrollment No/i.test(line)) {
        studentInfo.enrollmentNumber = line.replace(/Student Enrollment No/i, '').trim();
      }
      if (/Student Name/i.test(line)) {
        studentInfo.name = line.replace(/Student Name/i, '').trim();
      }
      if (/Institute Name/i.test(line)) {
        studentInfo.institute = line.replace(/Institute Name/i, '').trim();
      }
      if (/Semester/i.test(line) && !/Sem-I/i.test(line)) {
        studentInfo.semester = line.replace(/Semester/i, '').trim();
      }
      if (/Exam Name/i.test(line)) {
        studentInfo.examName = line.replace(/Exam Name/i, '').trim();
      }
      if (/Session - Year/i.test(line)) {
        studentInfo.session = line.replace(/Session - Year/i, '').trim();
      }
      if (/Course/i.test(line)) {
        studentInfo.course = line.replace(/Course/i, '').trim();
      }

      if (/Current Semester Backlog/i.test(line)) {
        const spiMatch = line.match(/SPI\s*:\s*(\d+\.\d+)/i);
        const cpiMatch = line.match(/CPI\s*:\s*(\d+\.\d+)/i);
        const resultMatch = line.match(/Result\s*:\s*(PASS|FAIL)/i);

        if (spiMatch) studentInfo.spi = parseFloat(spiMatch[1]);
        if (cpiMatch) studentInfo.cpi = parseFloat(cpiMatch[1]);
        if (resultMatch) studentInfo.resultStatus = resultMatch[1];
      }

      // Subject parsing
      if (row.length >= 7 && row[0] && row[1]) {
        const subject = row[0].trim();
        const theoryGrade = row[3]?.trim() || "-";
        const practicalGrade = row[5]?.trim() || "-";
        const finalGrade = row[6]?.trim() || "-";

        if (subject && subject !== "Subject Title") {
          courses.push({
            subject,
            theoryGrade,
            practicalGrade,
            finalGrade
          });
        }
      }
    });

    return { studentInfo, courses };
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

module.exports = so_parse;
