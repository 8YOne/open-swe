### CI Templates for Previews (Image-based strategy)

Add these to your app/project repo.

Create Preview on PR updates:
```yaml
name: Preview
on:
  pull_request:
    types: [opened, synchronize, ready_for_review]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and push
        run: |
          IMAGE=ghcr.io/${{ github.repository_owner }}/$(echo "${{ github.repository }}" | cut -d/ -f2):pr-${{ github.event.pull_request.number }}-${{ github.sha }}
          docker build -t $IMAGE .
          docker push $IMAGE
          echo "IMAGE=$IMAGE" >> $GITHUB_ENV
      - name: Call preview API by project
        run: |
          curl -sS -X POST "$WEB_API_URL/api/k8s/previews/by-project" \
            -H "content-type: application/json" \
            -H "x-preview-admin-token: $PREVIEW_ADMIN_TOKEN" \
            -d '{
              "projectId": '$PROJECT_ID',
              "branch": "'"${GITHUB_HEAD_REF:-$GITHUB_REF_NAME}"'",
              "image": "'"$IMAGE"'",
              "sha": "'"${{ github.sha }}"'"
            }'
        env:
          WEB_API_URL: https://your-open-swe-web.example.com
          PREVIEW_ADMIN_TOKEN: ${{ secrets.PREVIEW_ADMIN_TOKEN }}
          PROJECT_ID: 1
```

Cleanup on PR close:
```yaml
name: Cleanup Preview
on:
  pull_request:
    types: [closed]
jobs:
  destroy:
    runs-on: ubuntu-latest
    steps:
      - name: Delete preview
        run: |
          curl -sS -X DELETE "$WEB_API_URL/api/k8s/previews?project=$PROJECT&branch=${GITHUB_HEAD_REF:-$GITHUB_REF_NAME}" \
            -H "x-preview-admin-token: $PREVIEW_ADMIN_TOKEN"
        env:
          WEB_API_URL: https://your-open-swe-web.example.com
          PREVIEW_ADMIN_TOKEN: ${{ secrets.PREVIEW_ADMIN_TOKEN }}
          PROJECT: your-project-name
```


