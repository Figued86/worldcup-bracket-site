# World Cup 2026 Knockout Bracket Website

Website bracket infographic cho World Cup 2026, có thể chạy bằng dữ liệu demo/mock hoặc Free API.

## Chạy trên Mac

```bash
cd ~/Downloads/worldcup-bracket-site
npm install
cp .env.example .env
npm start
```

Mở trình duyệt:

```text
http://localhost:3000
```

## Data mode

Mặc định dùng Free API:

```env
DATA_MODE=free
FREE_API_URL=https://worldcup26.ir/get/games
REFRESH_CACHE_SECONDS=60
```

Để test đầy đủ scorer + card bằng dữ liệu mock:

```env
DATA_MODE=mock
```

Sau khi đổi `.env`, dừng server bằng `Control + C`, rồi chạy lại:

```bash
npm start
```

## Tính năng mới

- Card trận đấu được mở rộng để giảm tình trạng tên đội bị rút gọn bằng dấu `...`.
- Tên đội có thể xuống dòng để hiển thị đầy đủ hơn.
- Click chuột trái vào từng card trận để mở pop-up chi tiết.
- Click ra ngoài pop-up hoặc bấm `Esc` để ẩn pop-up.
- Pop-up hiển thị: tên đội đầy đủ, tỷ số, thời gian, sân, cầu thủ ghi bàn, số áo nếu API có dữ liệu, thẻ vàng và thẻ đỏ.

## Lưu ý

Free API không phải nguồn chính thức của FIFA, nên dữ liệu số áo cầu thủ, goal events và card events phụ thuộc vào API có trả về hay không. Website đã có fallback: nếu thiếu dữ liệu sẽ hiển thị `No scorer data` hoặc `No. TBC`.


## Vietnam time display

The frontend always displays match times in Vietnam time: `Asia/Ho_Chi_Minh` / `UTC+7`.

If the free API returns a date without timezone information, the backend assumes the source date is North American Eastern time by default:

```env
SOURCE_TIMEZONE=America/New_York
```

The backend converts that source time to ISO UTC, and the frontend formats it back to Vietnam time. Example: `2026-06-29 13:00 EDT` becomes `00:00 30/06/2026 UTC+7`.

## Bản cập nhật mới nhất

- Hiển thị thêm **kết quả penalty ngay trên match card** khi trận đấu có penalty shoot-out.
- Pop-up chi tiết vẫn hiển thị riêng phần **Penalty shoot-out**.
- Tối ưu thêm giao diện cho **iPhone 14 Pro Max**:
  - hỗ trợ `viewport-fit=cover`
  - tối ưu khoảng đệm theo safe area của iPhone
  - tăng kích thước vùng bấm
  - tăng độ rõ của font và score trên màn hình nhỏ
  - modal hiển thị gọn và dễ thao tác hơn trên mobile


## Mobile one-column + refresh indicator

Latest update includes:

- Mobile one-column layout for iPhone-style screens.
- Sticky round navigation on mobile.
- Popup open/close animation.
- Loading / auto refresh indicator in the header.
- Penalty shoot-out result shown both on match cards and in the detailed popup.

## Penalty display fix

Bản này đã sửa lại logic penalty:

- Backend đọc penalty từ nhiều dạng field khác nhau: `penalty`, `penalties`, `shootout`, `home_penalty_score`, `away_penalty_score`, `home_pens`, `away_pens`, `score.penalty`, `scores.penalties`, v.v.
- Pop-up luôn có mục **Penalty shoot-out**. Nếu trận không đá penalty hoặc API chưa trả dữ liệu, mục này sẽ ghi rõ `No penalty data`.
- Card trận đấu sẽ hiện `Pen: x-y` khi có dữ liệu penalty thật.
- Mock data đã có một trận mẫu có penalty để test nhanh bằng `DATA_MODE=mock`.

## Winner highlight + scorer corrections

- Winning team row is highlighted automatically.
- If a match is tied after extra time and has penalty data, the penalty winner is highlighted.
- Goal scorer names are rendered in bold on both the match card and the match detail popup.
- Verified correction overrides were added for currently known completed matches:
  - South Africa 0-1 Canada: Stephen Eustáquio, 90+2
  - Germany 1-1 Paraguay: Julio Enciso / Kai Havertz, Paraguay wins 4-3 on penalties
  - Brazil 2-1 Japan: Casemiro, Gabriel Martinelli / Kaishu Sano

## Black-gold theme update

- Site tone updated to a deeper black-gold World Cup look.
- Match cards, modal, mobile navigation, refresh indicator, winner highlight, and upcoming-match dimming are aligned with the new dark stadium background.

## Cập nhật compact score layout

- Card trận đấu được rút gọn theo kiểu scoreboard premium.
- Quốc kỳ đội bóng hiển thị dạng icon tròn lớn.
- Tỷ số từng đội được phóng lớn để đọc nhanh.
- Trận đã đá hiển thị rõ nhất.
- Trận chưa đá tự làm mờ theo khoảng cách ngày so với hôm nay theo timezone Việt Nam:
  - Hôm nay: mờ nhẹ.
  - Ngày kế tiếp: mờ hơn.
  - Xa hơn: chìm sâu vào nền.
- Logic này tự cập nhật theo ngày, không cần sửa thủ công.


## Latest adjustment

- Main bracket cards now show abbreviated country names only, maximum 5 first letters.
- Goal scorers, goal minutes, yellow cards and red cards are hidden from the main bracket.
- Full match details remain available inside the match pop-up.

## Automatic YouTube/Vimeo highlight search

Bản này hỗ trợ 2 lớp video highlight trong pop-up:

1. Nếu API/dữ liệu trận có sẵn `highlightUrl`, `videoUrl`, `highlights`, v.v. thì frontend nhúng trực tiếp YouTube/Vimeo/embed/mp4 như trước.
2. Nếu trận đã thi đấu nhưng chưa có link, backend có thể tự tìm highlight qua **YouTube Data API v3** bằng tên 2 đội + World Cup + năm thi đấu.

Cấu hình trên Render Environment hoặc file `.env` local:

```env
YOUTUBE_API_KEY=your_youtube_api_key_here
ENABLE_AUTO_HIGHLIGHT_SEARCH=true
ALLOW_UNVERIFIED_VIDEO_SEARCH=false
OFFICIAL_VIDEO_CHANNELS=FIFA,FOX Soccer,beIN SPORTS,TSN,Telemundo Deportes,BBC Sport,ITV Sport,SBS Sport
YOUTUBE_SEARCH_CACHE_HOURS=6
```

Khuyến nghị giữ `ALLOW_UNVERIFIED_VIDEO_SEARCH=false` để chỉ nhúng video từ các kênh official/whitelist. Nếu không có key YouTube hoặc không tìm được kênh hợp lệ, popup sẽ giữ trạng thái `Chưa có link video highlight cho trận này`.

## Troubleshooting highlight videos

If the popup still shows no embedded video:

1. Check `/api/health`. `autoHighlightSearch` must be `true` and `highlightVideoCount` should be greater than `0` after at least one played match has a valid result.
2. Add a real YouTube Data API v3 key to Render Environment as `YOUTUBE_API_KEY`.
3. Keep `ENABLE_AUTO_HIGHLIGHT_SEARCH=true`.
4. By default, only whitelisted official channels are embedded. If you need broader search during testing, set `ALLOW_UNVERIFIED_VIDEO_SEARCH=true`, then switch it back to `false` for production safety.
5. The demo/mock match data may not correspond to real highlight videos on YouTube. For guaranteed display, add `highlightUrl` directly to a match record.

The frontend also shows a quick YouTube search link when no embeddable video is found.
