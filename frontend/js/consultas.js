document.getElementById("selectConsulta").addEventListener("change", function () {
    var seleccion = parseInt(this.value);
    var descripcion = obtenerDescripcion(seleccion);
    document.getElementById("descripcionConsulta").innerHTML = "<p>" + descripcion + "</p>";
});

document.getElementById("btnEnviar").addEventListener("click", function () {
    var seleccion = parseInt(document.getElementById("selectConsulta").value);
    var url = "http://localhost:8081/consultas/" + seleccion;
    var titulonombre = "Consulta " + seleccion;


    crearPaginaHTML(url, titulonombre);
});

function crearPaginaHTML(url, titulonombre) {
    fetch(url)
        .then(response => response.json())
        .then(data => {
            // Crear un nuevo documento HTML
            var nuevoDocumento = document.implementation.createHTMLDocument('Nueva Página');

            // Agregar el enlace al CSS de Bootstrap
            var bootstrapCSS = nuevoDocumento.createElement('link');
            bootstrapCSS.rel = 'stylesheet';
            bootstrapCSS.href = 'https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css';
            nuevoDocumento.head.appendChild(bootstrapCSS);

            // Crear un título para la página con Bootstrap class
            var titulo = nuevoDocumento.createElement('h1');
            titulo.textContent = titulonombre;
            titulo.classList.add('display-4', 'text-center', 'mt-5');
            nuevoDocumento.body.appendChild(titulo);

            // Crear una tabla con Bootstrap class
            var tabla = nuevoDocumento.createElement('table');
            tabla.classList.add('table', 'table-striped');

            // Crear el encabezado de la tabla con Bootstrap class
            var encabezado = nuevoDocumento.createElement('thead');
            encabezado.classList.add('thead-dark');
            var encabezadoFila = nuevoDocumento.createElement('tr');
            for (var clave in data.columnNames) {
                var encabezadoCelda = nuevoDocumento.createElement('th');
                encabezadoCelda.textContent = data.columnNames[clave];
                encabezadoFila.appendChild(encabezadoCelda);
            }
            encabezado.appendChild(encabezadoFila);
            tabla.appendChild(encabezado);

            // Crear el cuerpo de la tabla
            var cuerpoTabla = nuevoDocumento.createElement('tbody');
            data.data.forEach(function (filaDatos) {
                var fila = nuevoDocumento.createElement('tr');
                for (var clave in filaDatos) {
                    var celda = nuevoDocumento.createElement('td');
                    celda.textContent = filaDatos[clave];
                    fila.appendChild(celda);
                }
                cuerpoTabla.appendChild(fila);
            });
            tabla.appendChild(cuerpoTabla);

            // Agregar la tabla al cuerpo del documento
            nuevoDocumento.body.appendChild(tabla);

            // Crear un enlace para descargar la página como archivo HTML
            var enlaceDescarga = nuevoDocumento.createElement('a');
            enlaceDescarga.href = URL.createObjectURL(new Blob([nuevoDocumento.documentElement.outerHTML], { type: 'text/html' }));
            enlaceDescarga.download = 'tabla_datos.html';
            enlaceDescarga.textContent = 'Descargar esta tabla como archivo HTML';
            enlaceDescarga.classList.add('btn', 'btn-primary', 'btn-lg', 'mt-3', 'd-block', 'mx-auto');
            nuevoDocumento.body.appendChild(enlaceDescarga);

            // Abrir la nueva página en una nueva pestaña
            window.open(enlaceDescarga.href, '_blank');
        });
}

function obtenerDescripcion(consulta) {
    // Aquí puedes definir las descripciones de cada consulta
    switch (consulta) {
        case 1:
            return "Lista de estudiantes en categoría A1";
        case 2:
            return "Listar los exámenes teóricos realizados por el matriculado con id 1";
        case 3:
            return "Obtener los detalles de las clases teóricas del matriculado con id 1";
        case 4:
            return "Obtener los detalles del instructor con id 1 y sus clases prácticas";
        case 5:
            return "Listar los resultados de los exámenes prácticos del matriculado con id 1";
        case 6:
            return "Obtener las clases prácticas que se impartieron con el vehículo con id 4";
        case 7:
            return "Obtener los exámenes prácticos realizados con un instructor con id 3";
        case 8:
            return "Obtener los matriculados que han aprobado el examen teórico";
        case 9:
            return "Obtener la lista de exámenes teoricos junto con los resultados";
        case 10:
            return "Obtener la lista de exámenes prácticos junto con los resultados y detalles del vehículo utilizado";
        default:
            return "No se encontró la descripción de la consulta";
    }
}
