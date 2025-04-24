const gnu_parse = require("./gnu_parse");
const so_parse = require("./so_parse");
const lj_parse = require("./lj_parse");


const university_code_map = {
    "Ganpat University": "GUNI",
    "Silver Oak University": "SO",
    "LJ University": "LJ"
  };
  

const university_parse_map = {
    "GUNI": new gnu_parse(),
    "SO": new so_parse(),
    // "LJ": new lj_parse(),
}

module.exports = { university_parse_map, university_code_map }