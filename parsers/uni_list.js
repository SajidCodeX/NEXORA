const gnu_parse = require("./gnu_parse");
const gmers_parse = require("./gmers_parse");
const lj_parse = require("./lj_parse");


const university_code_map = {
    "Ganpat University": "GUNI",
    "GMERS": "GMERS",
    "LJ University": "LJ"
  };
  

const university_parse_map = {
    "GUNI": new gnu_parse(),
    "GMERS": new gmers_parse(),
    // "LJ": new lj_parse(),
}

module.exports = { university_parse_map, university_code_map }