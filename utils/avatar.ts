export const DEFAULT_MAN_AVATAR =
  'https://res.cloudinary.com/dkj2qsk4z/image/upload/runhub_man_zsgfht';

export const DEFAULT_WOMAN_AVATAR =
  'https://res.cloudinary.com/dkj2qsk4z/image/upload/runhub_women_ipryxo';

export function getDefaultAvatarBySex(sex?: string) {
  if (sex?.toLowerCase() === 'female') {
    return DEFAULT_WOMAN_AVATAR;
  }

  return DEFAULT_MAN_AVATAR;
}

export function getProfileImage(photoURL?: string, sex?: string) {
  if (photoURL && photoURL.trim().length > 0) {
    return photoURL;
  }

  return getDefaultAvatarBySex(sex);
}