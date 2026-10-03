# Không gian biên tập — Trường Chính trị tỉnh Tây Ninh

[**Mở bản dùng thử công khai**](https://ventoan68.github.io/ban-tin-truong-chinh-tri-demo/)

Mở trực tiếp, không cần đăng nhập. Chọn vai trò ở góc trên để thử các bước xử lý.

## Chức năng

- Người nộp: nộp bài, tải tệp DOC/DOCX/PDF, xem tiến độ, nhận ý kiến tổng hợp và nộp phiên bản chỉnh sửa.
- Thư ký: sơ duyệt, trả bài kèm ý kiến, chuẩn bị bản ẩn danh, giao một bài cho một hoặc nhiều người phản biện với thời hạn riêng, tổng hợp nhận xét và gửi yêu cầu sửa.
- Người phản biện: chỉ màn hình hồ sơ được giao, nội dung và tệp ẩn danh; gửi kết quả Đạt, Cần chỉnh sửa hoặc Không đạt. Không hiển thị tác giả, bản gốc hay nhận xét của người phản biện khác.
- Bài chỉ được xác nhận đạt khi mọi lượt phản biện của phiên bản hiện tại đều đạt. Bản chỉnh sửa được sơ duyệt và phân công lại; kết quả cũ giữ trong lịch sử.
- Biên tập số bản tin, chọn bài đạt, sắp mục lục, đăng bài thử và ghi nhận phát hành số.
- Trưởng/Phó Ban biên tập: chỉ xem số liệu, tiến độ và thống kê; không có thao tác xử lý hồ sơ.
- Tìm kiếm, lọc trạng thái, cảnh báo phản biện quá hạn, báo cáo CSV, khôi phục dữ liệu mẫu và hoàn tác lần khôi phục.
- Giao diện đáp ứng máy tính và điện thoại.

## Phạm vi bản dùng thử

Dữ liệu và tệp lưu riêng trên trình duyệt đang sử dụng. Không đồng bộ giữa các máy hoặc người dùng. Chuyển vai trò là cách thử màn hình và quy trình; đây chưa phải phân quyền tài khoản trên máy chủ. Chỉ sử dụng tài liệu mẫu.

Thư ký phải kiểm tra danh tính trong tiêu đề, nội dung, tên tệp, bình luận và metadata trước khi giao phản biện. Không có cơ chế tự động bảo đảm đã ẩn danh. Thao tác đăng chỉ ghi nhận trong bản dùng thử, chưa tích hợp xuất bản lên website của trường.

Trang chạy trên GitHub Pages, độc lập với Codespaces. Các nguồn giao diện và xử lý quy trình nằm trong `index.html`, `styles.css`, `workflow.js`, `app.js`.

## Kiểm tra quy trình

Không cần cài thêm thư viện:

```sh
node --check app.js
node --check workflow.js
node --test workflow.test.cjs
```

Bộ kiểm tra bao gồm nhiều phản biện, vòng trả sửa, phân công lại theo phiên bản, phạm vi màn hình theo vai trò, dữ liệu ẩn danh và điều kiện đăng/phát hành.
