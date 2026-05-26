# Multi-stage build for the EPL .NET 10 solution.
# Build context is the repo root (so we can reach `apps/api/...` in COPY).
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj files first to get a cached restore layer.
COPY apps/api/src/Epl.Domain/Epl.Domain.csproj                 apps/api/src/Epl.Domain/
COPY apps/api/src/Epl.Application/Epl.Application.csproj       apps/api/src/Epl.Application/
COPY apps/api/src/Epl.Infrastructure/Epl.Infrastructure.csproj apps/api/src/Epl.Infrastructure/
COPY apps/api/src/Epl.Api/Epl.Api.csproj                       apps/api/src/Epl.Api/
RUN dotnet restore apps/api/src/Epl.Api/Epl.Api.csproj

# Copy source and publish.
COPY apps/api/src apps/api/src
RUN dotnet publish apps/api/src/Epl.Api/Epl.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Epl.Api.dll"]
