import { getBearerToken, validateJWT } from "../auth";
import { respondWithJSON } from "./json";
import { getVideo, updateVideo } from "../db/videos";
import type { ApiConfig } from "../config";
import type { BunRequest } from "bun";
import { BadRequestError, UserForbiddenError } from "./errors";
import path from "path";

export async function handlerUploadThumbnail(cfg: ApiConfig, req: BunRequest) {
  const { videoId } = req.params as { videoId?: string };
  if (!videoId) {
    throw new BadRequestError("Invalid video ID");
  }

  const token = getBearerToken(req.headers);
  const userID = validateJWT(token, cfg.jwtSecret);

  console.log("uploading thumbnail for video", videoId, "by user", userID);

  const formData = await req.formData();
  const thumbnail = formData.get("thumbnail");
  if (thumbnail instanceof File) {
    const MAX_UPLOAD_SIZE = 10 << 20;
    if (thumbnail.size > MAX_UPLOAD_SIZE) {
      throw new BadRequestError("Max upload size hitted");
    }
    const mediaType = thumbnail.type;
    const buff = await thumbnail.arrayBuffer();
    const data = Buffer.from(buff).toString("base64");

    const video = getVideo(cfg.db, videoId);
    if (video?.userID !== userID) {
      throw new UserForbiddenError("Your not the video author");
    }

    const dataPath = path.join(cfg.assetsRoot, `${video.id}.${mediaType}`);
    await Bun.write(dataPath, data);

    video.thumbnailURL = `http://localhost:${cfg.port}/assets/${video.id}.${mediaType}`;
    updateVideo(cfg.db, video);
    respondWithJSON(200, video);
  } else {
    throw new BadRequestError("Invalide thumbnail");
  }

  return respondWithJSON(200, null);
}
