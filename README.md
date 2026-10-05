# Bản tin Trường Chính trị tỉnh Tây Ninh

Ứng dụng tiếp nhận, phản biện và biên tập bài viết cho bản tin của trường. Chạy trên trình duyệt, không cần cài thêm thư viện.

Quy trình: người nộp gửi bài, thư ký sơ duyệt rồi giao cho một hoặc nhiều người phản biện (bản ẩn danh, hạn riêng cho từng người), tổng hợp ý kiến, xác nhận đạt và xếp bài vào số bản tin. Bài chưa đạt được trả về tác giả để chỉnh sửa và phân công lại.

Thư ký quản lý danh sách người nộp và người phản biện, chỉnh sửa họ tên, đơn vị, chuyên môn và thông tin liên hệ. Người mới chọn “Thêm người nộp mới”, điền thông tin rồi nộp bài; người nộp có thể cập nhật hồ sơ cá nhân.

Các vai trò: thư ký biên tập, người nộp bài, người phản biện, Trưởng và Phó Ban biên tập (chỉ xem số liệu).

## Chạy

Mở `index.html` qua một máy chủ web tĩnh, ví dụ:

```sh
python3 -m http.server 8000
```

rồi vào http://127.0.0.1:8000/. Trên Windows có thể chạy `CHAY-THU-WINDOWS.bat`. Để đưa lên GitHub Pages, giữ nguyên các tệp ở thư mục gốc và bật Pages cho nhánh `main`.

## Dữ liệu

Hồ sơ và tệp đính kèm lưu trong trình duyệt đang dùng. Thư ký có thể xuất và nhập dữ liệu để chuyển sang máy khác (tệp đính kèm không đi theo). Tệp Word của bài do hệ thống tạo ra khi người nộp không đính kèm tệp.

## Kiểm tra

```sh
node --test workflow.test.cjs
```

## Tệp

| Tệp | Nội dung |
| --- | --- |
| `workflow.js` | Quy tắc nghiệp vụ, số liệu |
| `samples.js` | Bộ bài viết có sẵn |
| `docx.js` | Tạo tệp Word |
| `ui.js`, `views.js`, `app.js` | Giao diện |
| `styles.css` | Giao diện sáng và tối |
| `sw.js`, `manifest.webmanifest` | Cài đặt và dùng khi mất mạng |
