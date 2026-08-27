import React, { useEffect, useState } from "react";

// Calcula distancia en metros entre dos coordenadas (Haversine)
function distanceMeters(lat1, lon1, lat2, lon2) {
	const toRad = (v) => (v * Math.PI) / 180;
	const R = 6371000; // metros
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
			Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

export default function Geolocalizacion({
	allowedLocation, // { lat, lng } opcional — puede pasarse desde props
	radiusMeters = 50, // radio por defecto en metros
	fetchAllowedUrl = "/api/admin/location", // intento de fallback para obtener ubicación permitida
	onPhoto = () => {},
}) {
	const [position, setPosition] = useState(null);
	const [distance, setDistance] = useState(null);
	const [inside, setInside] = useState(false);
	const [allowedFromServer, setAllowedFromServer] = useState(null);
	const [preview, setPreview] = useState(null);
	const [error, setError] = useState(null);

	// Obtener ubicación permitida desde backend si no se pasa por props
	useEffect(() => {
		if (!allowedLocation) {
			fetch(fetchAllowedUrl)
				.then((r) => {
					if (!r.ok) throw new Error("no server");
					return r.json();
				})
				.then((data) => {
					// esperar { lat, lng, radiusMeters }
					if (data && data.lat && data.lng) setAllowedFromServer(data);
				})
				.catch(() => {
					// silent fallback: si no hay endpoint, seguir usando props/default
				});
		}
	}, [allowedLocation, fetchAllowedUrl]);

	// Solicitar la posición del usuario
	useEffect(() => {
		if (!navigator.geolocation) {
			setError("Geolocalización no soportada en este navegador");
			return;
		}

		const success = (pos) => {
			const coords = {
				lat: pos.coords.latitude,
				lng: pos.coords.longitude,
			};
			setPosition(coords);
		};

		const fail = (err) => {
			setError(err.message || "No se pudo obtener ubicación");
		};

		const id = navigator.geolocation.watchPosition(success, fail, {
			enableHighAccuracy: true,
			maximumAge: 5000,
			timeout: 10000,
		});

		return () => navigator.geolocation.clearWatch(id);
	}, []);

	// Calcular distancia y validar si está dentro del radio
	useEffect(() => {
		const allowed = allowedLocation || allowedFromServer;
		if (!position || !allowed) return;
		const d = distanceMeters(position.lat, position.lng, allowed.lat, allowed.lng);
		setDistance(Math.round(d));
		setInside(d <= (allowed.radiusMeters ?? radiusMeters));
	}, [position, allowedLocation, allowedFromServer, radiusMeters]);

	function handleFileChange(e) {
		const file = e.target.files && e.target.files[0];
		if (!file) return;
		if (!inside) {
			alert("No estás dentro del rango permitido. No se puede tomar foto.");
			return;
		}
		const url = URL.createObjectURL(file);
		setPreview(url);
		onPhoto(file);
	}

	const allowed = allowedLocation || allowedFromServer;

	return (
		<div style={{ maxWidth: 420 }}>
			<h3>Geolocalización</h3>
			{error && <div style={{ color: "red" }}>{error}</div>}
			<div>
				<strong>Ubicación permitida:</strong>{" "}
				{allowed ? `${allowed.lat}, ${allowed.lng} (radio ${allowed.radiusMeters ?? radiusMeters} m)` : "No disponible"}
			</div>
			<div>
				<strong>Tu posición:</strong>{" "}
				{position ? `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}` : "Obteniendo..."}
			</div>
			<div>
				<strong>Distancia:</strong>{" "}{distance === null ? "-" : `${distance} m`}
			</div>
			<div>
				<strong>Estado:</strong>{" "}
				{inside ? (
					<span style={{ color: "green" }}>Dentro del rango — puedes tomar foto</span>
				) : (
					<span style={{ color: "orange" }}>Fuera del rango — foto deshabilitada</span>
				)}
			</div>

			<div style={{ marginTop: 10 }}>
				<label style={{ display: "inline-block" }}>
					<input
						type="file"
						accept="image/*"
						capture="environment"
						onChange={handleFileChange}
						disabled={!inside}
						style={{ display: "none" }}
						id="take-photo-input"
					/>
					<button
						type="button"
						onClick={() => document.getElementById("take-photo-input").click()}
						disabled={!inside}
					>
						Tomar foto
					</button>
				</label>
			</div>

			{preview && (
				<div style={{ marginTop: 10 }}>
					<strong>Preview:</strong>
					<div>
						<img src={preview} alt="preview" style={{ maxWidth: "100%", borderRadius: 6 }} />
					</div>
				</div>
			)}
		</div>
	);
}

