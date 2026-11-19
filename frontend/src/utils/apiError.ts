import { API_BASE_URL } from '../api/client';

export function getApiErrorMessage(error: any, fallback = 'Có lỗi xảy ra.') {
  const detail = error?.response?.data?.detail;

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const field = Array.isArray(item?.loc)
          ? item.loc[item.loc.length - 1]
          : 'trường dữ liệu';
        return `${field}: ${item?.msg ?? 'Dữ liệu không hợp lệ'}`;
      })
      .join(' | ');
  }

  if (detail && typeof detail === 'object') {
    return JSON.stringify(detail);
  }

  if (error?.message === 'Network Error' || error?.code === 'ERR_NETWORK') {
    return `Không kết nối được tới backend tại ${API_BASE_URL}. Hãy kiểm tra FastAPI đang chạy, địa chỉ API đúng, và frontend origin đã được cho phép trong CORS.`;
  }

  return fallback;
}
