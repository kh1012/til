const axios = require("axios");
const fs = require("fs");

const owner = "kh1012"; // 리포지토리의 소유자
const repo = "til"; // 리포지토리 이름
const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/`;

async function generateTree(path = "", indent = "") {
  const res = await axios.get(apiUrl + path);
  const files = res.data;
  let tree = "";

  for (const file of files) {
    if (file.type === "dir") {
      // 디렉토리인 경우
      tree += `${indent}[${file.name}](${file.html_url})\n`;
      tree += await generateTree(file.path, indent + "  "); // 들여쓰기를 통해 서브디렉토리 생성
    } else {
      // 파일인 경우
      tree += `${indent}  ㄴ[${file.name}](${file.html_url})\n`; // 파일 앞에 'ㄴ'을 붙여 계층 표시
    }
  }

  return tree;
}

async function updateReadme() {
  const tree = await generateTree(); // 디렉토리 트리 생성
  const readmePath = "./README.md";

  const readmeContent = `## Directory Tree\n\n${tree}`; // 디렉토리 트리를 markdown 형식으로

  // README.md에 새로운 내용 작성
  fs.writeFileSync(readmePath, readmeContent);
  console.log("README.md has been updated.");
}

updateReadme();
