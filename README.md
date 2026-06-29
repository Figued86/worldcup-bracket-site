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
