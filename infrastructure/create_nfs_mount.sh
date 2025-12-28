
mkdir -p /workdisk/infrastructure/nfs-mount

#sudo mount -t nfs localhost:/data/shared /workdisk/infrastructure/nfs-mount

sudo mount -t nfs -o vers=4 localhost:/ /workdisk/infrastructure/nfs-mount/

