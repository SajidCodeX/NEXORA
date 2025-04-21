const fs = require("fs");
const pdfParse = require("pdf-parse");

async function parseGanpatResult(pdfPath) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  const lines = data.text
  .replace(/[ \t]+/g, " ")
  .replace(/\n{2,}/g, "\n")
  .split("\n")
  .map(line => line.trim())
  .filter(Boolean);
  
  return processGanpatResult(lines);
}



function processGanpatResult(lines) {
  return {
    studentInfo: extractStudentInfo(lines),
    courses: extractCourses(lines),
    performance: extractPerformance(lines)
  };
}

function extractStudentInfo(lines) {
  let enrollmentNumber = "N/A", name = "N/A", branch = "N/A", semester = "N/A";
  let examMonthYear = "NOV-DEC 2024", examType = "REGULAR", programme = "BACHELOR OF TECHNOLOGY", institute = "U.V. PATEL COLLEGE OF ENGINEERING", resultStatus = "N/A";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\d{11}/.test(line)) {
      enrollmentNumber = line.slice(0, 11);
      name = line.slice(11).trim();
      branch = `${lines[i + 1]} ${lines[i + 2]}`.trim();
    }

    if (/^I{1,3}$|IV|V|VI|VII|VIII/.test(line)) {
      semester = line.trim();
    }

    if (/PASS|FAIL/i.test(line)) {
      resultStatus = line.match(/PASS|FAIL/i)[0];
    }
  }

  return {
    enrollmentNumber,
    name,
    branch,
    semester,
    examMonthYear,
    examType,
    programme,
    institute,
    resultStatus
  };
}


/**
 * 
 * @param {*} lines 
 * @returns 
 */
function extractCourses(lines) {
  const courses = { theory: [], practical: [] };

  for (let line of lines) {
    // Match compressed course lines like: 2CEIT701COMPILER DESIGN-THEORY3.00C515.00
    const match = line.match(/^([A-Z0-9]+)([A-Z& \-]+)(\d\.\d{2})([A-Z\+]+)(\d+)(\d+\.\d{2})$/);
    if (match) {
      const [, code, rawTitle, credit, grade, gradePoint, creditPoint] = match;
      const title = rawTitle.trim().replace(/\s{2,}/g, " ");

      const course = {
        code,
        title,
        credit: parseFloat(credit),
        grade,
        gradePoint: parseInt(gradePoint),
        creditPoint: parseFloat(creditPoint)
      };

      if (title.includes("-THEORY") || course.credit >= 3) {
        courses.theory.push(course);
      } else {
        courses.practical.push(course);
      }
    }

    // Match practical lines like: COMPILER DESIGN1.00B77.00
    const match2 = line.match(/^([A-Z& \-]+)(\d\.\d{2})([A-Z\+]+)(\d+)(\d+\.\d{2})$/);
    if (match2) {
      const [, rawTitle, credit, grade, gradePoint, creditPoint] = match2;
      const title = rawTitle.trim().replace(/\s{2,}/g, " ");
      const course = {
        code: "",
        title,
        credit: parseFloat(credit),
        grade,
        gradePoint: parseInt(gradePoint),
        creditPoint: parseFloat(creditPoint)
      };
      courses.practical.push(course);
    }
  }

  return courses;
}

function extractPerformance(lines) {
  const numericLines = lines.filter(line => {
    const nums = line.trim().split(" ");
    return nums.length === 6 && nums.every(n => /^\d+(\.\d+)?$/.test(n));
  });

  const parseLine = (line) => {
    const [a, b, c, d, e, f] = line.split(" ").map(n => parseFloat(n));
    return {
      totalCredits: a,
      earnedCredits: b,
      totalGradePoints: c,
      creditPointsEarned: d,
      sgpa: e,
      backlog: parseInt(f)
    };
  };

  return {
    currentSemester: numericLines[0] ? parseLine(numericLines[0]) : emptyPerf(),
    progressive: numericLines[1] ? parseLine(numericLines[1]) : emptyPerf()
  };
}

function emptyPerf() {
  return {
    totalCredits: 0,
    earnedCredits: 0,
    totalGradePoints: 0,
    creditPointsEarned: 0,
    sgpa: 0,
    backlog: 0
  };
}

module.exports = { parseGanpatResult };