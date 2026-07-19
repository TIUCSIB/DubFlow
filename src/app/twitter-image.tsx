import { createSocialImage, socialImageSize } from "@/lib/social-image";

export const alt =
  "DubFlow - YouTube \u667a\u80fd\u5b57\u5e55\u3001\u7ffb\u8bd1\u4e0e\u4e2d\u6587\u914d\u97f3\u5de5\u4f5c\u53f0";
export const size = socialImageSize;
export const contentType = "image/png";

export default function TwitterImage() {
  return createSocialImage();
}
