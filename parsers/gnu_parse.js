const { exec } = require('child_process');
const path = require('path');

class gnu_parse {
  async parse(pdfPath) {
    const tables = await this.extractTableFromPDF(pdfPath);
    return this.processGanpatResult(tables);
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

  processGanpatResult(tables) {
    const allCells = this.flattenTables(tables);

    const result = {
      studentInfo: this.extractStudentInfo(allCells),
      courses: this.extractCourses(allCells),
      performance: this.extractPerformance(allCells),
      userInfo: {}
    };

    // Validation checks:
    this.validateParsedResult(result);

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

  extractStudentInfo(rows) {
    console.log("Rows:", rows);

    let enrollmentNumber = "N/A", name = "N/A", branch = "N/A", semester = "N/A";
    let monthAndYearOfExamination = "N/A", examType = "N/A", programme = "N/A", institute = "N/A", resultStatus = "N/A";

    let basicInfo_rows = [];
    rows.forEach((row, i) => {
      if (row[0].match(/Enrollment\s*Number/i)) {
        basicInfo_rows.push(...[row, rows[i + 1]]);
      }
    });

    console.log("🎯 Basic Info Rows:", basicInfo_rows);

    if (basicInfo_rows.length >= 2) {
      const headers = basicInfo_rows[0];
      const dataRow = basicInfo_rows[1];

      headers.forEach((header, index) => {
        const value = (dataRow[index]?.replace(/\r/g, ' ').trim()) || "";

        if (/Enrollment\s*Number/i.test(header)) {
          enrollmentNumber = value || "N/A";
        }
        if (/Name/i.test(header)) {
          name = value || "N/A";
        }
        if (/Branch/i.test(header)) {
          branch = (value && value !== '-----') ? value : "N/A";
        }
        if (/Semester/i.test(header)) {
          semester = value || "N/A";
        }
        if (/Month\s*and\s*Year\s*of\s*Examination/i.test(header)) {
          let val = (dataRow[index]?.replace(/\r/g, ' ').trim()) || "N/A";

          if (val.includes("REGULAR") || val.includes("SUPPLEMENTARY")) {
            const parts = val.split(/\b(REGULAR|SUPPLEMENTARY)\b/i);
            monthAndYearOfExamination = parts[0].trim();
            examType = parts[1]?.toUpperCase() || "N/A";
          } else {
            monthAndYearOfExamination = val;
          }
        }
      });
    }

    // Now scan other lines for extra info
    rows.forEach(row => {
      const line = row.join(' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();

      if (line.includes('Programme') && programme === "N/A") {
        const progMatch = line.match(/Programme\s*(.+)/i);
        if (progMatch) {
          programme = progMatch[1].trim();
        }
      }

      if (line.includes('Name of Institute') && institute === "N/A") {
        const instMatch = line.match(/Name of Institute\s*(.+)/i);
        if (instMatch) {
          institute = instMatch[1].trim();
        }
      }

      if (/\b(REGULAR|SUPPLEMENTARY)\b/i.test(line)) {
        const examTypeMatch = line.match(/\b(REGULAR|SUPPLEMENTARY)\b/i);
        if (examTypeMatch) {
          examType = examTypeMatch[1].toUpperCase();
        }
      }

      if (/\b(PASS|FAIL)\b/i.test(line)) {
        const resultStatusMatch = line.match(/\b(PASS|FAIL)\b/i);
        if (resultStatusMatch) {
          resultStatus = resultStatusMatch[1].toUpperCase();
        }
      }
    });

    return {
      enrollmentNumber,
      name,
      branch,
      semester,
      monthAndYearOfExamination,
      examType,
      programme,
      institute,
      resultStatus
    };
  }

  extractCourses(rows) {
    const courses = { theory: [], practical: [] };
    let parsingCourses = false;

    for (const row of rows) {
      const line = row.join(' ').trim();

      if (/^Course Code/i.test(line)) {
        parsingCourses = true;
        continue;
      }
      if (/Current Semester Performance/i.test(line)) {
        parsingCourses = false;
        continue;
      }

      if (parsingCourses && row.filter(x => x).length >= 4) {
        const code = row[0]?.trim() || '';
        const title = row[1]?.trim() || '';
        const credit = parseFloat(row[2]) || 0;
        const grade = row[3]?.trim() || '';
        const gradePoint = parseInt(row[4]) || 0;
        const creditPoint = parseFloat(row[5]) || 0;

        if (/-THEORY/i.test(title)) {
          courses.theory.push({
            code,
            title: title.replace(/-THEORY/i, '').trim(),
            credit,
            grade,
            gradePoint,
            creditPoint
          });
        } else {
          courses.practical.push({
            code,
            title,
            credit,
            grade,
            gradePoint,
            creditPoint
          });
        }
      }
    }

    return courses;
  }

  extractPerformance(rows) {
    let currentPerformance = null;
    let progressivePerformance = null;

    for (const row of rows) {
      const line = row.join(' ').trim();
      if (/^\d{1,3}\.\d{2} \d{1,3}\.\d{2} \d{1,3}\.\d{2}/.test(line)) {
        const nums = line.split(/\s+/).map(parseFloat);
        if (!currentPerformance) {
          currentPerformance = nums;
        } else if (!progressivePerformance) {
          progressivePerformance = nums;
        }
      }
    }

    const parsePerformance = (nums) => {
      if (!nums || nums.length < 4) return this.emptyPerf();
      return {
        totalCredits: nums[0] || 0,
        earnedCredits: nums[1] || 0,
        totalGradePoints: nums[2] || 0,
        creditPointsEarned: nums[3] || 0,
        sgpa: nums[4] || 0,
        backlog: parseInt(nums[5]) || 0
      };
    };

    return {
      currentSemester: parsePerformance(currentPerformance),
      progressive: parsePerformance(progressivePerformance)
    };
  }

  emptyPerf() {
    return {
      totalCredits: 0,
      earnedCredits: 0,
      totalGradePoints: 0,
      creditPointsEarned: 0,
      sgpa: 0,
      backlog: 0
    };
  }

  // New validation function
  validateParsedResult(result) {
    const { studentInfo, courses, performance } = result;

    // Check if all student info is "N/A"
    if (Object.values(studentInfo).every(value => value === "N/A")) {
      throw new Error("Student information is incomplete.");
    }

    // Check if no courses were extracted
    if (courses.theory.length === 0 && courses.practical.length === 0) {
      throw new Error("No courses found.");
    }

    // Check if all performance values are 0
    const { currentSemester, progressive } = performance;
    if (
      currentSemester.sgpa === 0 &&
      currentSemester.totalCredits === 0 &&
      progressive.sgpa === 0 &&
      progressive.totalCredits === 0
    ) {
      throw new Error("Performance data is incomplete.");
    }
  }
}

module.exports = gnu_parse;
