const { exec } = require("child_process");
const path = require("path");

class gmer_parse {
  async parse(pdfPath) {
    const tables = await this.extractTableFromPDF(pdfPath);
    const parsedData = this.processResult(tables);

    // ✅ VALIDATION: Check for empty or invalid result
    const isInvalid =
      (!parsedData.studentInfo?.seatNumber || parsedData.studentInfo.seatNumber === "N/A") &&
      (!parsedData.studentInfo?.name || parsedData.studentInfo.name === "N/A") &&
      parsedData.subjects.length === 0 &&
      parsedData.totalMarks.university === 0 &&
      parsedData.totalMarks.internal === 0 &&
      parsedData.totalMarks.grand === 0;

    if (isInvalid) {
      throw new Error("Invalid GMERS result format or unrelated PDF.");
    }

    return parsedData;
  }

  extractTableFromPDF(pdfPath) {
    return new Promise((resolve, reject) => {
      const tabulaJarPath = path.resolve(__dirname, "../tabula.jar");
      const command = `java -jar "${tabulaJarPath}" -l -p all -f JSON "${pdfPath}"`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error("Tabula error:", stderr);
          return reject(error);
        }
        try {
          const tables = JSON.parse(stdout);
          resolve(tables);
        } catch (err) {
          console.error("JSON parse error:", stdout);
          reject(err);
        }
      });
    });
  }

  processResult(tables) {
    const rows = this.flattenTables(tables);
    const totalData = this.extractTotals(rows);

    return {
      studentInfo: this.extractStudentInfo(rows),
      subjects: this.extractSubjects(rows),
      totalMarks: totalData.totals,
      result: totalData.result
    };
  }

  flattenTables(tables) {
    const rows = [];
    for (const table of tables) {
      for (const row of table.data) {
        rows.push(row.map(cell => (cell.text || "").replace(/\r/g, ' ').trim()));
      }
    }
    return rows;
  }

  extractStudentInfo(rows) {
    let seatNumber = "N/A", name = "N/A", enrollmentNumber = "N/A", college = "N/A";

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (row.includes("SEAT NO.")) {
        const dataRow = rows[i + 1];
        seatNumber = dataRow?.[1] || "N/A";
        name = dataRow?.[2] || "N/A";
        enrollmentNumber = dataRow?.[3] || "N/A";
      }

      if (row[1]?.includes("GMERS MEDICAL COLLEGE")) {
        college = row[1].replace("COLLEGE", "").trim();
      }
    }

    return { seatNumber, name, enrollmentNumber, college };
  }

  extractSubjects(rows) {
    const subjects = [];
    const subjectKeywords = ["COMMUNITY", "FORENSIC"];

    for (const row of rows) {
      const subjectNameRaw = row[1]?.toUpperCase() || "";
      if (subjectKeywords.some(k => subjectNameRaw.includes(k))) {
        const name = row[1].replace(/\r/g, ' ').trim();

        const externalTheoryMax = parseInt(row[2]) || "N/A";
        const externalTheoryObtained = parseInt(row[3]) || "N/A";
        const internalTheoryMax = parseInt(row[4]) || "N/A";
        const internalTheoryObtained = parseInt(row[5]) || "N/A";
        const externalPracticalMax = parseInt(row[6]) || "N/A";
        const externalPracticalObtained = parseInt(row[7]) || "N/A";
        const internalPracticalMax = parseInt(row[8]) || "N/A";
        const internalPracticalObtained = parseInt(row[9]) || "N/A";

        subjects.push({
          name,
          externalTheory: { max: externalTheoryMax, obtained: externalTheoryObtained },
          internalTheory: { max: internalTheoryMax, obtained: internalTheoryObtained },
          externalPractical: { max: externalPracticalMax, obtained: externalPracticalObtained },
          internalPractical: { max: internalPracticalMax, obtained: internalPracticalObtained }
        });
      }
    }

    return subjects;
  }

  extractTotals(rows) {
    for (const row of rows) {
      const label = row[1]?.toUpperCase() || "";
      const data = row[2] || "";

      if (label.includes("UNIVERSITY TOTAL")) {
        const parts = data.split(/\r|\n| /).filter(x => x.trim());
        const university = parseInt(parts[0]) || 0;
        const internal = parseInt(parts[1]) || 0;
        const grand = parseInt(parts[2]) || 0;
        const result = parts[3]?.toUpperCase() || "N/A";

        return {
          totals: { university, internal, grand },
          result
        };
      }
    }

    return {
      totals: { university: 0, internal: 0, grand: 0 },
      result: "N/A"
    };
  }
}

module.exports = gmer_parse;
