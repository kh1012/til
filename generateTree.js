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

// 모든 파일을 수집하는 함수
async function collectAllFiles(path = "") {
  const res = await axios.get(apiUrl + path, { headers });
  const files = res.data;
  let allFiles = [];

  for (const file of files) {
    // Ignore List에 포함된 디렉토리는 건너뜁니다.
    if (ignoreList.includes(file.name)) {
      continue;
    }

    if (file.type === "dir") {
      // 서브 디렉토리의 파일들도 수집
      const subFiles = await collectAllFiles(file.path);
      allFiles = allFiles.concat(subFiles);
    } else {
      // 파일 정보를 추가 (경로와 함께)
      allFiles.push({
        name: file.name,
        path: file.path,
        html_url: file.html_url,
        fullPath: path ? `${path}/${file.name}` : file.name,
      });
    }
  }

  return allFiles;
}

// 날짜순으로 정렬하는 함수
function sortByDate(files) {
  return files.sort((a, b) => {
    // 파일명에서 날짜 추출 (25XXXX 형식)
    const dateA = a.name.match(/^(\d{6})/);
    const dateB = b.name.match(/^(\d{6})/);

    if (dateA && dateB) {
      return dateB[1].localeCompare(dateA[1]); // 역순 정렬을 위해 b와 a의 순서를 바꿈
    }

    // 날짜가 없는 파일은 뒤로
    if (!dateA && !dateB) return a.name.localeCompare(b.name);
    if (!dateA) return 1;
    if (!dateB) return -1;

    return 0;
  });
}

// 특정 파일명이면 필터링 하는 함수
function filterFiles(files) {
  return files.filter((file) => {
    // .md 확장자만 허용
    if (!file.name.endsWith(".md")) {
      return false;
    }

    return true;
  });
}

async function updateReadme() {
  let readmeContent = "# TIL (Today I Learned)\n\n";

  // 루트 디렉토리 목록에 대해 파일 수집
  for (const rootDir of rootDirectories) {
    readmeContent += `## ${rootDir}\n\n`;

    // 모든 파일 수집
    const allFiles = await collectAllFiles(rootDir);

    // 날짜순으로 정렬
    const sortedFiles = sortByDate(allFiles);

    // 특정 파일명이면 필터링
    const filteredFiles = filterFiles(sortedFiles);

    // 정렬된 파일 목록 생성
    for (const file of filteredFiles) {
      readmeContent += `- [${file.name}](${file.html_url})\n`;
    }

    readmeContent += "\n";
  }

  // README.md 파일 업데이트
  const readmePath = "./README.md";
  fs.writeFileSync(readmePath, readmeContent);
  console.log("README.md has been updated with date-sorted file list.");
}

updateReadme();
