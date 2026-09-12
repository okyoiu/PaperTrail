// capture="environment" opens the rear camera directly on mobile browsers —
// no getUserMedia/permissions plumbing needed for a hackathon demo.
export default function CameraCapture({ onCapture, label = 'Snap a photo for your review' }) {
  function handleChange(event) {
    const file = event.target.files?.[0]
    if (file) onCapture(file)
  }

  return (
    <label className="camera-capture">
      {label}
      <input type="file" accept="image/*" capture="environment" onChange={handleChange} hidden />
    </label>
  )
}
