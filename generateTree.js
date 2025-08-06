const axios = require("axios");
const fs = require("fs");

const owner = "kh1012"; // 리포지토리의 소유자
const repo = "til"; // 리포지토리 이름
const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/`;

async function generateTree(path = "") {
  const res = await axios.get(apiUrl + path);
  const files = res.data;
  let tree = "";

  for (const file of files) {
    if (file.type === "dir") {
      tree += `- [${file.name}](${file.html_url})\n`;
      tree += await generateTree(file.path); // 재귀적으로 서브디렉토리 처리
    } else {
      tree += `- [${file.name}](${file.html_url})\n`;
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
