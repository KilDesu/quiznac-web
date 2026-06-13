export interface ImgbbResponse {
  data: {
    id: string;
    title: string;
    url_viewer: string;
    url: string;
    display_url: string;
    width: string;
    height: string;
    size: string;
    time: string;
    expiration: string;
    image: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    thumb: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    medium: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    delete_url: string;
  };
  success: boolean;
  status: number;
}

export async function addImageToDb(image: string | File) {
  if (typeof image === "string" && image.startsWith("https://i.ibb.co")) {
    return image;
  }

  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;

  const data = new FormData();
  data.append("image", image);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body: data,
  });

  const json = (await response.json()) as ImgbbResponse;

  if (json.success) {
    return json.data.url;
  }

  console.error({ data: data.get("image"), json, response });

  throw new Error(
    `Impossible d'ajouter l'image à ImgBB. Le serveur a répondu avec le statut ${json.status}`,
  );
}
