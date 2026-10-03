# Imagen del servidor C# (opcional: para quien prefiera Docker)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish src/AsaderoPioPio -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
ENV AbrirNavegador=false
EXPOSE 5080
ENTRYPOINT ["dotnet", "AsaderoPioPio.dll"]
