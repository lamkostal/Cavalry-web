from workers import WorkerEntrypoint, Response

from hello import hello


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        url = request.url

        if "/api/hello" in url:
            if request.method == "POST":
                body = await request.json()
                name = getattr(body, "name", "World")
                return Response(hello(name))

            return Response(hello("World"))

        if "/api/env" in url:
            return Response(self.env.API_HOST)

        return await self.env.ASSETS.fetch(request)
