document.addEventListener("DOMContentLoaded", function() {
	const botonListar = document.getElementById("boton-listar");
	const botonOcultar = document.getElementById("boton-ocultar");

	botonListar.addEventListener("click", function() {
		const tipoDatos = document.getElementById("tipo-datos").value;
		let url = "";
		let cardTitle = document.getElementById('card-title');
		console.log(tipoDatos);
		if (tipoDatos === "cliente") {
			url = "http://localhost:8081/cliente";
			cardTitle.textContent = "Cliente";
		} else if (tipoDatos === "instructor") {
			url = "http://localhost:8081/instructor";
			cardTitle.textContent = "Instructor";
		} else if (tipoDatos === "clase-practica") {
			url = "http://localhost:8081/clase-practica";
			cardTitle.textContent = "Clase Práctica";
		} else if (tipoDatos === "clase-teorica") {
			url = "http://localhost:8081/claseteorica";
			cardTitle.textContent = "Clase Teorica";
		} else if (tipoDatos === "vehiculos") {
			url = "http://localhost:8081/vehiculo";
			cardTitle.textContent = "Vehículos";
		} else if (tipoDatos === "categoria") {
			url = "http://localhost:8081/categoria";
			cardTitle.textContent = "Categoría";
		} else if (tipoDatos === "examen-practico") {
			url = "http://localhost:8081/examen-practico";
			cardTitle.textContent = "Examen Práctico";
		} else if (tipoDatos === "examen-teorico") {
			url = "http://localhost:8081/examen-teorico";
			cardTitle.textContent = "Examen Teórico";
		} else if (tipoDatos === "matriculados") {
			url = "http://localhost:8081/matriculados";
			cardTitle.textContent = "Matriculados";
		}

		// Agrega más condiciones según sea necesario para otros tipos de datos

		fetch(url)
			.then(response => response.json())
			.then(data => {
				// Mostrar la tabla y el botón de ocultar
				document.getElementById("tabla-container").style.display = "block";
				botonOcultar.style.display = "inline-block";

				// Limpiar tabla
				const tabla = document.getElementById("tabla-datos");
				tabla.innerHTML = "";

				if (data.length === 0) {
					// Manejar el caso de que no haya datos
					const mensaje = document.createElement("p");
					mensaje.textContent = `No hay ${tipoDatos}s para mostrar.`;
					tabla.appendChild(mensaje);
				} else {
					// Crear la cabecera de la tabla
					const thead = document.createElement("thead");
					const headerRow = document.createElement("tr");

					// Obtener las claves de la primera fila para crear las columnas
					Object.keys(data[0]).forEach(key => {
						const th = document.createElement("th");
						th.textContent = key;
						headerRow.appendChild(th);
					});
					thead.appendChild(headerRow);
					tabla.appendChild(thead);

					// Crear el cuerpo de la tabla
					const tbody = document.createElement("tbody");
					data.forEach(item => {
						const row = document.createElement("tr");
						Object.values(item).forEach(value => {
							const td = document.createElement("td");
							td.textContent = value;
							row.appendChild(td);
						});
						tbody.appendChild(row);
					});
					tabla.appendChild(tbody);
				}
			})
			.catch(error => {
				console.error("Error al listar datos:", error);
			});
	});

	botonOcultar.addEventListener("click", function() {
		// Ocultar la tabla y el botón de ocultar
		document.getElementById("tabla-container").style.display = "none";
		botonOcultar.style.display = "none";
	});
});