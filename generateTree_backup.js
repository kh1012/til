const axios = require("axios");
const fs = require("fs");

const owner = "kh1012";
const repo = "til";
const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/`;

// 루트 디렉토리 설정: 2025만 포함
const rootDirectories = ["2025"]; // 2025 디렉토리만 트리로 생성

// Ignore할 디렉토리 리스트: node_modules와 .github만 제외
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
      tree += `${indent}[${file.name}](${file.html_url})<br />\n`; // 디렉토리 링크 + <br />로 줄 바꿈
      tree += await generateTree(file.path, indent + "  "); // 서브 디렉토리 재귀 호출
    } else {
      tree += `${indent}  ㄴ[${file.name}](${file.html_url})<br />\n`; // 파일 링크 + <br />로 줄 바꿈
    }
  }

  return tree;
}

async function updateReadme() {
  let readmeContent = ""; // 헤더 제거, 트리만 추가

  // 루트 디렉토리 목록에 대해 트리 생성 (2025만 포함)
  for (const rootDir of rootDirectories) {
    readmeContent += `[${rootDir}](${apiUrl}${rootDir})<br />`; // 루트 디렉토리 링크
    const tree = await generateTree(rootDir); // 지정된 루트 디렉토리만 트리로 생성
    readmeContent += tree + "<br />"; // 각 루트 디렉토리의 트리를 추가
  }

  // README.md 파일 업데이트
  const readmePath = "./README.md";
  fs.writeFileSync(readmePath, readmeContent);
  console.log("README.md has been updated.");
}

updateReadme();
