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
