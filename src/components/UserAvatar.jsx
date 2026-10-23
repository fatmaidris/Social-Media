import { getDisplayName, getImageUrl } from '../utils/apiData.js';

export default function UserAvatar({ person, className = 'avatar', imageAlt = '' }) {
  const image = getImageUrl(person);
  const name = getDisplayName(person);
  if (image) return <img className={`${className} user-avatar-image`} src={image} alt={imageAlt} />;
  if (name) return <span className={`${className} user-avatar-initial`} aria-label={name}>{name.slice(0, 1).toUpperCase()}</span>;
  return <span className={`${className} user-avatar-empty`} aria-hidden="true" />;
}