import axios from "axios";

const baseURL = "/api";

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "content-type": "application/json",
    accept: "application/json",
    "x-requested-with": "open-swe-web",
  },
});

export const adminApi = axios.create({
  baseURL: "/api/admin",
  withCredentials: true,
  headers: {
    "content-type": "application/json",
    accept: "application/json",
    "x-requested-with": "open-swe-web",
  },
});

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err),
);

type AuthErrorHandler = (status: number) => void;
let authErrorHandler: AuthErrorHandler | null = null;

export function setAuthErrorHandler(handler: AuthErrorHandler) {
  authErrorHandler = handler;
}

function attachAuthInterceptors(instance: typeof api) {
  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      const status: number | undefined = err?.response?.status;
      if (status === 401 || status === 403) {
        if (authErrorHandler) authErrorHandler(status);
        else if (typeof window !== "undefined") {
          // Default: redirect to home (or a sign-in page if present)
          window.location.href = "/";
        }
      }
      return Promise.reject(err);
    },
  );
}

attachAuthInterceptors(api);
attachAuthInterceptors(adminApi);


