const axios = require("axios");
const fs = require("fs");

const owner = "kh1012";
const repo = "til";
const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/`;

// 인증을 위해 헤더에 Personal Access Token 추가
const token = process.env.GH_PAT; // PAT을 환경 변수로 받음
const headers = {
  Authorization: `token ${token}`,
  Accept: "application/vnd.github.v3+json",
};

async function generateTree(path = "", indent = "") {
  const res = await axios.get(apiUrl + path, { headers });
  const files = res.data;
  let tree = "";

  for (const file of files) {
    if (file.type === "dir") {
      tree += `${indent}[${file.name}](${file.html_url})\n`;
      tree += await generateTree(file.path, indent + "  "); // 서브 디렉토리 재귀 호출
    } else {
      tree += `${indent}  ㄴ[${file.name}](${file.html_url})\n`;
    }
  }

  return tree;
}

async function updateReadme() {
  const tree = await generateTree(); // 디렉토리 트리 생성
  const readmePath = "./README.md";

  const readmeContent = `## Directory Tree\n\n${tree}`; // Markdown 형식

  // README.md 파일 업데이트
  fs.writeFileSync(readmePath, readmeContent);
  console.log("README.md has been updated.");
}

updateReadme();
