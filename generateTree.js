const axios = require("axios");
const fs = require("fs");

const owner = "kh1012";
const repo = "til";
const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/`;

// 여러 개의 루트 디렉토리 설정
const rootDirectories = []; // 예시로 2025, 2024, 2026 디렉토리만 트리로 생성

// Ignore할 디렉토리 리스트
const ignoreList = ["node_modules", ".github"];

// 인증을 위해 헤더에 Personal Access Token 추가
const token = process.env.GH_PAT;
const headers = {
  Authorization: `token ${token}`,
  Accept: "application/vnd.github.v3+json",
};

async function generateTree(path = "", indent = "") {
  const res = await axios.get(apiUrl + path, { headers });
  const files = res.data;
  let tree = "";

  for (const file of files) {
    // Ignore List에 포함된 디렉토리는 건너뜁니다.
    if (ignoreList.includes(file.name)) {
      continue;
    }

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
  let readmeContent = "## Directory Tree\n\n";

  // 루트 디렉토리 목록에 대해 트리 생성
  for (const rootDir of rootDirectories) {
    readmeContent += `### ${rootDir}\n\n`;
    const tree = await generateTree(rootDir); // 지정된 루트 디렉토리만 트리로 생성
    readmeContent += tree + "\n\n"; // 각 루트 디렉토리의 트리를 추가
  }

  // README.md 파일 업데이트
  const readmePath = "./README.md";
  fs.writeFileSync(readmePath, readmeContent);
  console.log("README.md has been updated.");
}

updateReadme();
