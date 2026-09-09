function EventPhotoGallery({ photos }: { photos: { id: string; photo_url: string }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {photos.map((photo) => (
        <div key={photo.id} className="aspect-square overflow-hidden rounded-lg">
          <img
            src={photo.photo_url}
            alt="Event photo"
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      ))}
    </div>
  );
}