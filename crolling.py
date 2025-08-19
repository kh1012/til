# -*- coding: utf-8 -*-
import time, re
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
import pandas as pd
from urllib import robotparser

BASE = "https://www.eng-tips.com"
BOARD_URL = "https://www.eng-tips.com/forums/structural-engineering-general-discussion.507/"  # 구조 일반
PAGES = 2  # 테스트용: 최근 2페이지만

USER_AGENT = "Mozilla/5.0 (compatible; midas-research-bot/0.1; +https://midasit.com)"
TIMEOUT = 20

# 1) robots.txt 확인 (가능하면 지키기)
rp = robotparser.RobotFileParser()
rp.set_url(urljoin(BASE, "/robots.txt"))
try:
    rp.read()
    if not rp.can_fetch(USER_AGENT, BOARD_URL):
        raise SystemExit("robots.txt에서 이 경로 크롤링이 불가로 표시되어 중단합니다.")
except Exception as e:
    print("robots.txt를 확인하지 못했습니다(네트워크/접근 이슈 가능). 신중히 진행합니다:", e)

# 숫자 파싱(예: '88K' → 88000)
def parse_count(t: str):
    if t is None:
        return None
    s = t.strip().replace(",", "").upper()
    if s.endswith("K"):
        try:
            return int(float(s[:-1]) * 1000)
        except:
            return None
    return int(re.sub(r"[^\d]", "", s)) if re.search(r"\d", s) else None

# 2) 단일 페이지 파싱
def parse_forum_page(html: str, base=BASE):
    soup = BeautifulSoup(html, "html.parser")
    rows = []

    # XenForo 기반 포럼: 목록에서 thread 링크는 보통 /threads/ 로 시작
    # (클래스명이 바뀔 수 있어 href 패턴으로 수집 → 주변 텍스트에서 보조정보 추출)
    for a in soup.select("a[href^='/threads/']"):
        title = a.get_text(strip=True)
        # 제목이 비어있거나 'Question' 같은 라벨만이면 건너뜀
        if not title or title.lower() in {"question", "locked"}:
            continue

        url = urljoin(base, a.get("href"))
        item = {"title": title, "thread_url": url}

        # 근처(같은 아이템 블록)에서 'Replies','Views', 시간 정보 추정 추출
        container = a.find_parent()
        # 조금 더 넓게 묶인 부모를 찾아 텍스트 블록 확보
        for _ in range(3):
            if container and len(container.get_text(strip=True)) < 20:
                container = container.find_parent()
        block_text = container.get_text(" ", strip=True) if container else ""

        # 2-1) 시간: time 태그의 datetime 속성 우선, 없으면 문자열(Friday at 7:44 PM 등) 캡처
        time_tag = container.find("time") if container else None
        if time_tag and time_tag.has_attr("datetime"):
            item["started_raw"] = time_tag["datetime"]
        else:
            # 제목 다음에 붙는 'Friday at 7:44 PM' 같은 패턴을 완화 추출
            after = a.find_next(string=True)
            item["started_raw"] = (after or "").strip()

        # 2-2) Replies / Views
        m_r = re.search(r"Replies\s+([\d,]+K?)", block_text, re.I)
        m_v = re.search(r"Views\s+([\d,]+K?)", block_text, re.I)
        item["replies"] = parse_count(m_r.group(1)) if m_r else None
        item["views"] = parse_count(m_v.group(1)) if m_v else None

        rows.append(item)

    # 중복(같은 thread URL) 제거
    uniq = {}
    for r in rows:
        uniq[r["thread_url"]] = r
    return list(uniq.values())

# 3) 페이지 루프 수집
def fetch_board(board_url=BOARD_URL, pages=PAGES):
    headers = {"User-Agent": USER_AGENT}
    all_rows = []
    for p in range(1, pages + 1):
        url = board_url.rstrip("/")
        if p > 1:
            url = f"{url}/page-{p}"
        print("GET", url)
        res = requests.get(url, headers=headers, timeout=TIMEOUT)
        res.raise_for_status()
        all_rows.extend(parse_forum_page(res.text))
        time.sleep(1.0)  # 예의있게
    return all_rows

rows = fetch_board()
df = pd.DataFrame(rows)
print("샘플:", df.head(3), sep="\n")

# 4) 날짜 정규화 → 일/주 집계
df["started_dt"] = pd.to_datetime(df["started_raw"], errors="coerce")
df = df.dropna(subset=["started_dt"]).copy()
df["date"] = df["started_dt"].dt.date

daily = df.groupby("date").size().rename("questions_per_day").reset_index()
weekly = df.set_index("started_dt").resample("W").size().rename("questions_per_week").reset_index()

print("\n일별 건수(상위 10일):")
print(daily.sort_values("date", ascending=False).head(10))

print("\n주별 건수(상위 8주):")
print(weekly.sort_values("started_dt", ascending=False).head(8))

# 5) (옵션) 제목 키워드 빠르게 보기
TOP_N = 15
token = (
    df["title"]
      .str.lower()
      .str.replace(r"[^a-z0-9\s\-_/&]", " ", regex=True)
      .str.split()
)
from collections import Counter
cnt = Counter(w for words in token.dropna() for w in words if len(w) >= 4)
print(f"\n제목 키워드 Top {TOP_N}:")
print(pd.Series(dict(cnt.most_common(TOP_N))))
