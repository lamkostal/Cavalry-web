from workers import WorkerEntrypoint, Response

from hello import hello


CAVALRY_DEMOS_PREFIX = "/cavalry-demos"


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

        response = await self.env.ASSETS.fetch(request)
        if response.status != 404 or CAVALRY_DEMOS_PREFIX not in url:
            return response

        rewritten_url = url.replace(CAVALRY_DEMOS_PREFIX, "", 1)
        return await self.env.ASSETS.fetch(rewritten_url)
