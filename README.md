# VietTranslate - Chrome Extension

Tiện ích dịch thuật song ngữ Việt-Anh thông minh, sử dụng Local AI (OpenAI-compatible API).

## Tính năng

- 🌐 **Dịch trang web tự động**: Phát hiện ngôn ngữ và dịch Việt ↔ Anh
- 🔄 **Toggle click**: Click vào từ đã dịch để chuyển đổi giữa bản gốc và bản dịch
- 🤖 **Nhiều model AI**: Hỗ trợ GPT-4, Claude, Llama, Mistral, Gemma, và nhiều model khác
- 🔑 **Local API**: Sử dụng local chatbot của bạn tại `http://localhost:8317/v1`
- 🌙 **Dark mode**: Giao diện tối hiện đại, dễ nhìn
- ⌨️ **Phím tắt**: Alt+T để dịch nhanh

## Cài đặt

1. Mở Chrome và truy cập `chrome://extensions/`
2. Bật **Developer mode** (góc trên bên phải)
3. Click **Load unpacked**
4. Chọn thư mục `VietTranslate`

## Cấu hình

1. Click icon extension → **Cài đặt** (⚙️)
2. Nhập API Endpoint (mặc định: `http://localhost:8317/v1`)
3. Nhập API Key (nếu cần)
4. Chọn model AI từ danh sách hoặc nhập tên model tùy chỉnh
5. Lưu cài đặt

## Sử dụng

1. **Dịch trang**: Click "Dịch trang này" hoặc nhấn `Alt+T`
2. **Toggle**: Click vào bất kỳ từ đã dịch để chuyển đổi giữa bản gốc/dịch
3. **Xóa**: Click "Xóa bản dịch" để xóa tất cả bản dịch

## Model AI hỗ trợ

| Provider | Models |
|----------|--------|
| OpenAI | gpt-4, gpt-4-turbo, gpt-3.5-turbo |
| Anthropic | claude-3-opus, claude-3-sonnet, claude-3-haiku |
| Meta | llama-3-70b, llama-3-8b |
| Mistral | mistral-large, mistral-medium, mistral-7b |
| Google | gemma-7b, gemma-2b |
| Other | qwen-72b, deepseek-coder, codellama-34b |

## Công nghệ

- Chrome Extension Manifest V3
- OpenAI-compatible API
- Language detection với Vietnamese diacritics pattern
- DOM manipulation với inline translation
- CSS animations và dark theme

## License

MIT
